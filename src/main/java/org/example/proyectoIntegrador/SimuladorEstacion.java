package org.example.proyectoIntegrador;

import org.eclipse.paho.client.mqttv3.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Random;

public class SimuladorEstacion {
    private static final String BROKER = "tcp://mqtt.eict.ce.pucmm.edu.do:1883";
    private static final String USUARIO = "itt363-grupo2";
    private static final String CLAVE = "knDH2P6N4w9g";

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

    public static void main(String[] args) {
        String clientId = "SimuladorG2-" + System.currentTimeMillis();

        EstadoClima climaEstacion1 = new EstadoClima();
        EstadoClima climaEstacion2 = new EstadoClima();
        climaEstacion2.temperatura = 22.0;
        climaEstacion2.humedadSuelo = 80.0;

        // Formateador estándar ISO 8601 (Ejemplo: 2026-05-27T21:02:05)
        DateTimeFormatter formateadorFecha = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

        try {
            MqttClient cliente = new MqttClient(BROKER, clientId);
            MqttConnectOptions opciones = new MqttConnectOptions();
            opciones.setUserName(USUARIO);
            opciones.setPassword(CLAVE.toCharArray());
            opciones.setAutomaticReconnect(true);

            cliente.connect(opciones);
            System.out.println("Publicador conectado exitosamente.");

            while (true) {
                climaEstacion1.actualizar();
                climaEstacion2.actualizar();

                EstadoClima[] climas = {climaEstacion1, climaEstacion2};

                // Capturamos el momento exacto en el que se toman las lecturas de esta iteración
                String timestampActual = LocalDateTime.now().format(formateadorFecha);

                for (int i = 0; i < 2; i++) {
                    int numEstacion = i + 1;
                    String base = "/itt363-grupo2/estacion-" + numEstacion + "/sensores/";
                    EstadoClima climaActual = climas[i];

                    // Enviamos los datos concatenando el valor leído con el timestamp usando el separador "|"
                    publicar(cliente, base + "temperatura", String.format("%.2f", climaActual.temperatura), timestampActual);
                    publicar(cliente, base + "humedad_aire", String.format("%.2f", climaActual.humedadAire), timestampActual);
                    publicar(cliente, base + "presion", String.format("%.2f", climaActual.presion), timestampActual);
                    publicar(cliente, base + "velocidad_viento", String.format("%.2f", climaActual.velocidadViento), timestampActual);
                    publicar(cliente, base + "direccion_viento", climaActual.getDireccionViento(), timestampActual);
                    publicar(cliente, base + "lluvia", String.format("%.2f", climaActual.lluviaAcumulada), timestampActual);
                    publicar(cliente, base + "humedad_suelo", String.format("%.2f", climaActual.humedadSuelo), timestampActual);

                    System.out.println("  [Estacion " + numEstacion + "] -> T: " + String.format("%.1f", climaActual.temperatura) + "°C | H: " + String.format("%.1f", climaActual.humedadAire) + "% | Sincronizado a: " + timestampActual);
                }

                System.out.println("--- Sincronización completa ");
                Thread.sleep(5000);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void publicar(MqttClient cliente, String topic, String valor, String timestamp) throws MqttException {
        String payloadConTiempo = valor.replace(",", ".") + "|" + timestamp;
        MqttMessage mensaje = new MqttMessage(payloadConTiempo.getBytes());
        mensaje.setQos(1);
        cliente.publish(topic, mensaje);
    }
}