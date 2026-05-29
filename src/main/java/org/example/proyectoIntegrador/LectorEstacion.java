package org.example.proyectoIntegrador;

import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class LectorEstacion {
    private static final String BROKER       = "tcp://mqtt.eict.ce.pucmm.edu.do:1883";
    private static final String USUARIO      = "itt363-grupo2";
    private static final String CLAVE        = "knDH2P6N4w9g";
    private static final String TOPIC_GLOBAL = "/itt363-grupo2/+/sensores/#";

    private static final String BD_URL = "jdbc:postgresql://localhost:5432/EstacionMetereologica";
    private static final String BD_USUARIO   = "java_user";
    private static final String BD_CLAVE     = "Daury201";

    private static final DateTimeFormatter FORMATO_ENTRADA = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
    private static final DateTimeFormatter FORMATO_SALIDA  = DateTimeFormatter.ofPattern("HH:mm:ss");

    public static void main(String[] args) {
        String clientId = "LectorG2-Optimizado";

        try {
            Connection conexionBD = DriverManager.getConnection(BD_URL, BD_USUARIO, BD_CLAVE);
            System.out.println("[!] Conectado a la base de datos PostgreSQL exitosamente.");

            MqttClient cliente = new MqttClient(BROKER, clientId, new MemoryPersistence());

            MqttConnectOptions opciones = new MqttConnectOptions();
            opciones.setUserName(USUARIO);
            opciones.setPassword(CLAVE.toCharArray());
            opciones.setAutomaticReconnect(true);

            cliente.setCallback(new MqttCallback() {
                public void connectionLost(Throwable cause) {
                    System.out.println("[!] Conexión perdida. Reconectando...");
                }

                public void messageArrived(String topic, MqttMessage message) {
                    try {
                        String payloadRaw = new String(message.getPayload());

                        String[] partesPayload = payloadRaw.split("\\|");
                        String valor = partesPayload[0];
                        String timestampPublicado = partesPayload[1];

                        LocalDateTime fechaHoraPublicada = LocalDateTime.parse(timestampPublicado, FORMATO_ENTRADA);
                        String horaImpresion = fechaHoraPublicada.format(FORMATO_SALIDA);

                        String[] partes  = topic.split("/");
                        String estacion  = partes.length > 2 ? partes[2] : "desconocida";
                        String sensor    = partes.length > 4 ? partes[4] : "desconocido";

                        int estacionId = Integer.parseInt(estacion.replace("estacion-", ""));

                        String sql = "INSERT INTO lecturas_sensores (estacion_id, fecha_hora, " + sensor + ") " +
                                "VALUES (?, ?::timestamp, ?) " +
                                "ON CONFLICT (estacion_id, fecha_hora) DO UPDATE " +
                                "SET " + sensor + " = EXCLUDED." + sensor;

                        PreparedStatement pstmt = conexionBD.prepareStatement(sql);
                        pstmt.setInt(1, estacionId);
                        pstmt.setString(2, timestampPublicado);

                        if (sensor.equals("direccion_viento")) {
                            pstmt.setString(3, valor);
                        } else {
                            pstmt.setDouble(3, Double.parseDouble(valor));
                        }

                        pstmt.executeUpdate();

                        String unidad = switch (sensor) {
                            case "temperatura"      -> "°C";
                            case "humedad_aire",
                                 "humedad_suelo"    -> "%";
                            case "presion"          -> "hPa";
                            case "velocidad_viento" -> "km/h";
                            case "lluvia"           -> "mm";
                            case "direccion_viento" -> "";
                            default                 -> "";
                        };

                        System.out.printf("[%s] %-12s | %-20s | %s %s%n",
                                horaImpresion, estacion, sensor, valor, unidad);

                    } catch (Exception e) {
                        System.err.println("Error procesando mensaje y guardando en BD: " + e.getMessage());
                    }
                }

                public void deliveryComplete(IMqttDeliveryToken token) {}
            });

            cliente.connect(opciones);
            cliente.subscribe(TOPIC_GLOBAL, 1);

            System.out.println("╔══════════════════════════════════════════════════════╗");
            System.out.println("║     ESTACION METEOROLOGICA - GRUPO 2 - LECTOR        ║");
            System.out.println("╠══════════════════════════════════════════════════════╣");
            System.out.printf("║  Broker  : %-41s ║%n", BROKER);
            System.out.printf("║  Topic   : %-41s ║%n", TOPIC_GLOBAL);
            System.out.println("╚══════════════════════════════════════════════════════╝");
            System.out.println();
            System.out.printf("%-10s %-14s %-22s %s%n", "[HORA]", "[ESTACION]", "[SENSOR]", "[VALOR]");
            System.out.println("─".repeat(56));

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}

