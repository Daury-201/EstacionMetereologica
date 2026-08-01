package com.grupo2;
import com.grupo2.controlador.LecturaController;
import com.grupo2.modelo.LecturaSensor;
import com.grupo2.servicio.AlarmaService;
import com.grupo2.servicio.PucmmHubService;
import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
@Component
public class LectorEstacion {
    @Value("${mqtt.broker}")
    private String broker;
    @Value("${mqtt.usuario}")
    private String usuario;
    @Value("${mqtt.clave}")
    private String clave;
    @Value("${mqtt.topic}")
    private String topicGlobal;
    private final JdbcTemplate jdbcTemplate;
    private final LecturaController lecturaController;
    private final AlarmaService alarmaService;
    private final PucmmHubService pucmmHubService;

    public LectorEstacion(JdbcTemplate jdbcTemplate,
                          LecturaController lecturaController,
                          AlarmaService alarmaService,
                          PucmmHubService pucmmHubService) {
        this.jdbcTemplate = jdbcTemplate;
        this.lecturaController = lecturaController;
        this.alarmaService = alarmaService;
        this.pucmmHubService = pucmmHubService;
    }
    private static final DateTimeFormatter FORMATO_ENTRADA =
            DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final DateTimeFormatter FORMATO_SALIDA =
            DateTimeFormatter.ofPattern("HH:mm:ss");
    @PostConstruct
    public void iniciar() {
        try {
            System.out.println("Base de datos conectada.");
            String clientId = "LectorG2-" + System.currentTimeMillis();
            MqttClient cliente = new MqttClient(
                    broker,
                    clientId,
                    new MemoryPersistence()
            );
            MqttConnectOptions opciones = new MqttConnectOptions();
            if (usuario != null && !usuario.isEmpty()) {
                opciones.setUserName(usuario);
            }
            if (clave != null && !clave.isEmpty()) {
                opciones.setPassword(clave.toCharArray());
            }
            opciones.setAutomaticReconnect(true);
            opciones.setCleanSession(true);
            cliente.setCallback(new MqttCallback() {
                @Override
                public void connectionLost(Throwable cause) {
                    System.out.println("Conexión MQTT perdida.");
                }
                @Override
                public void messageArrived(String topic, MqttMessage message) {
                    try {
                        String payload = new String(message.getPayload());
                        String[] partesPayload = payload.split("\\|");
                        if (partesPayload.length != 2) {
                            System.err.println("Payload inválido: " + payload);
                            return;
                        }
                        String valor = partesPayload[0];
                        String timestamp = partesPayload[1];
                        LocalDateTime fechaHora = LocalDateTime.parse(
                                timestamp, FORMATO_ENTRADA);
                        String hora = fechaHora.format(FORMATO_SALIDA);
                        String[] partesTopic = topic.split("/");
                        if (partesTopic.length < 5) {
                            System.err.println("Topic inválido: " + topic);
                            return;
                        }
                        String estacion = partesTopic[2];
                        String sensor = partesTopic[4];

                        // Convertir "estacion-1" a "EST-001"
                        int numeroEstacion = Integer.parseInt(estacion.replace("estacion-", ""));
                        String estacionCodigo = String.format("EST-%03d", numeroEstacion);

                        // Buscar el ID real de la base de datos usando el código
                        Integer estacionId;
                        try {
                            estacionId = jdbcTemplate.queryForObject("SELECT id FROM estaciones WHERE codigo = ?", Integer.class, estacionCodigo);
                        } catch (org.springframework.dao.EmptyResultDataAccessException e) {
                            System.err.println("Estación no encontrada en la BD con el código: " + estacionCodigo);
                            return;
                        }

                        Object valorDb = sensor.equals("direccion_viento") ? valor : Double.parseDouble(valor);
                        String checkSql = "SELECT count(*) FROM lecturas_sensores WHERE estacion_id = ? AND fecha_hora = CAST(? AS TIMESTAMP)";
                        int count = jdbcTemplate.queryForObject(checkSql, Integer.class, estacionId, timestamp);
                        if (count > 0) {
                            String updateSql = "UPDATE lecturas_sensores SET " + sensor + " = ?, origen = 'ARDUINO' WHERE estacion_id = ? AND fecha_hora = CAST(? AS TIMESTAMP)";
                            jdbcTemplate.update(updateSql, valorDb, estacionId, timestamp);
                        } else {
                            String insertSql = "INSERT INTO lecturas_sensores (estacion_id, fecha_hora, origen, " + sensor + ") VALUES (?, CAST(? AS TIMESTAMP), 'ARDUINO', ?)";
                            jdbcTemplate.update(insertSql, estacionId, timestamp, valorDb);
                        }
                        if (!sensor.equals("direccion_viento")) {
                            alarmaService.evaluarSensor(estacionId, sensor, (Double) valorDb);
                        }
                        String sqlSelect =
                                "SELECT * FROM lecturas_sensores " +
                                        "WHERE estacion_id = ? ORDER BY fecha_hora DESC LIMIT 1";
                        List<LecturaSensor> resultado = jdbcTemplate.query(
                                sqlSelect,
                                (rs, rowNum) -> {
                                    LecturaSensor l = new LecturaSensor();
                                    l.setId(rs.getLong("id"));
                                    l.setEstacionId(rs.getInt("estacion_id"));
                                    l.setFechaHora(rs.getTimestamp("fecha_hora").toLocalDateTime());
                                    double v;
                                    v = rs.getDouble("temperatura");
                                    l.setTemperatura(rs.wasNull() ? null : v);
                                    v = rs.getDouble("humedad_aire");
                                    l.setHumedadAire(rs.wasNull() ? null : v);
                                    v = rs.getDouble("presion");
                                    l.setPresion(rs.wasNull() ? null : v);
                                    v = rs.getDouble("velocidad_viento");
                                    l.setVelocidadViento(rs.wasNull() ? null : v);
                                    l.setDireccionViento(rs.getString("direccion_viento"));
                                    v = rs.getDouble("lluvia");
                                    l.setLluvia(rs.wasNull() ? null : v);
                                    v = rs.getDouble("humedad_suelo");
                                    l.setHumedadSuelo(rs.wasNull() ? null : v);
                                    l.setOrigen(rs.getString("origen"));
                                    return l;
                                },
                                estacionId
                        );
                        if (!resultado.isEmpty()) {
                            LecturaSensor lecturaActual = resultado.get(0);
                            // Actualizar la interfaz (WebSocket) con cada cambio
                            lecturaController.enviarNuevaLectura(lecturaActual);

                            // Enviar al Hub externo solo cuando la lectura esté completa (todos los sensores presentes)
                            boolean estaCompleta = lecturaActual.getTemperatura() != null &&
                                                   lecturaActual.getHumedadAire() != null &&
                                                   lecturaActual.getPresion() != null &&
                                                   lecturaActual.getVelocidadViento() != null &&
                                                   lecturaActual.getDireccionViento() != null &&
                                                   lecturaActual.getLluvia() != null &&
                                                   lecturaActual.getHumedadSuelo() != null;
                            
                            if (estaCompleta && sensor.equals("direccion_viento")) {
                                pucmmHubService.enviarLectura(lecturaActual);
                            } else if (estaCompleta && !sensor.equals("direccion_viento")) {
                                // Alternativamente, puedes enviarla en cuanto esté completa sin importar qué sensor llegó último
                                // pucmmHubService.enviarLectura(lecturaActual);
                            }
                        }
                        String unidad = switch (sensor) {
                            case "temperatura" -> "°C";
                            case "humedad_aire", "humedad_suelo" -> "%";
                            case "presion" -> "hPa";
                            case "velocidad_viento" -> "km/h";
                            case "lluvia" -> "mm";
                            default -> "";
                        };
                        System.out.printf(
                                "[%s] Estación %d | %-20s | %s %s%n",
                                hora, estacionId, sensor, valor, unidad
                        );
                    } catch (Exception e) {
                        System.err.println("Error guardando lectura: " + e.getMessage());
                    }
                }
                @Override
                public void deliveryComplete(IMqttDeliveryToken token) {
                }
            });
            cliente.connect(opciones);
            cliente.subscribe(topicGlobal, 1);
            System.out.println("MQTT conectado.");
            System.out.println("Escuchando: " + topicGlobal);
        } catch (Exception e) {
            System.err.println("Error iniciando LectorEstacion:");
            e.printStackTrace();
        }
    }
}