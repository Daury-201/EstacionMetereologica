package com.grupo2;
import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
@Component
public class SimuladorEstacion {
    @Value("${mqtt.broker}")
    private String broker;
    @Value("${mqtt.usuario}")
    private String usuario;
    @Value("${mqtt.clave}")
    private String clave;
    @Value("${simulador.activo:false}")
    private boolean activo;
    private final JdbcTemplate jdbcTemplate;
    private MqttClient cliente;
    private Map<Long, EstadoClima> climaPorEstacion = new HashMap<>();
    public SimuladorEstacion(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
    @PostConstruct
    public void inicializar() {
        if (!activo) return;
        try {
            String clientId = "SimuladorG2-" + System.currentTimeMillis();
            cliente = new MqttClient(broker, clientId, new MemoryPersistence());
            MqttConnectOptions opciones = new MqttConnectOptions();
            if (usuario != null && !usuario.isEmpty()) {
                opciones.setUserName(usuario);
            }
            if (clave != null && !clave.isEmpty()) {
                opciones.setPassword(clave.toCharArray());
            }
            opciones.setAutomaticReconnect(true);
            cliente.connect(opciones);
            System.out.println("Simulador conectado al MQTT. (Broker: " + broker + ")");
        } catch (Exception e) {
            System.err.println("Error iniciando simulador: " + e.getMessage());
        }
    }
    @Scheduled(fixedRate = 5000)
    public void simular() {
        if (!activo || cliente == null || !cliente.isConnected()) return;
        try {
            List<Long> estacionesIds = jdbcTemplate.queryForList("SELECT id FROM estaciones", Long.class);
            DateTimeFormatter formateadorFecha = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
            String timestampActual = LocalDateTime.now().format(formateadorFecha);
            for (Long id : estacionesIds) {
                EstadoClima clima = climaPorEstacion.computeIfAbsent(id, k -> new EstadoClima());
                clima.actualizar();
                String base = "/itt363-grupo2/estacion-" + id + "/sensores/";
                publicar(base + "temperatura", String.format("%.2f", clima.temperatura), timestampActual);
                publicar(base + "humedad_aire", String.format("%.2f", clima.humedadAire), timestampActual);
                publicar(base + "presion", String.format("%.2f", clima.presion), timestampActual);
                publicar(base + "velocidad_viento", String.format("%.2f", clima.velocidadViento), timestampActual);
                publicar(base + "direccion_viento", clima.getDireccionViento(), timestampActual);
                publicar(base + "lluvia", String.format("%.2f", clima.lluviaAcumulada), timestampActual);
                publicar(base + "humedad_suelo", String.format("%.2f", clima.humedadSuelo), timestampActual);
            }
        } catch (Exception e) {
            System.err.println("Error en el ciclo de simulación: " + e.getMessage());
        }
    }
    private void publicar(String topic, String valor, String timestamp) throws MqttException {
        String payloadConTiempo = valor.replace(",", ".") + "|" + timestamp;
        MqttMessage mensaje = new MqttMessage(payloadConTiempo.getBytes());
        mensaje.setQos(1);
        cliente.publish(topic, mensaje);
    }
    static class EstadoClima {
        double temperatura = 28.0;
        double humedadAire = 70.0;
        double presion = 1012.0;
        double velocidadViento = 10.0;
        int direccionVientoIdx = 0;
        double lluviaAcumulada = 0.0;
        double humedadSuelo = 40.0;
        final String[] rosaVientos = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};
        Random rnd = new Random();
        void actualizar() {
            temperatura = limitar(temperatura + (rnd.nextDouble() - 0.5), 20.0, 38.0);
            humedadAire = limitar(humedadAire + (rnd.nextDouble() * 2 - 1), 50.0, 95.0);
            presion = limitar(presion + (rnd.nextDouble() - 0.5), 1000.0, 1020.0);
            velocidadViento = limitar(velocidadViento + (rnd.nextDouble() * 4 - 2), 0.0, 50.0);
            if (rnd.nextDouble() < 0.2) {
                int giro = rnd.nextBoolean() ? 1 : -1;
                direccionVientoIdx = (direccionVientoIdx + giro + 8) % 8;
            }
            if (rnd.nextDouble() < 0.1) {
                double aguacero = rnd.nextDouble() * 1.5;
                lluviaAcumulada += aguacero;
                humedadSuelo = limitar(humedadSuelo + (aguacero * 10), 0.0, 100.0);
            } else {
                humedadSuelo = limitar(humedadSuelo - 0.1, 15.0, 100.0);
            }
        }
        String getDireccionViento() {
            return rosaVientos[direccionVientoIdx];
        }
        private double limitar(double valor, double min, double max) {
            return Math.max(min, Math.min(max, valor));
        }
    }
}