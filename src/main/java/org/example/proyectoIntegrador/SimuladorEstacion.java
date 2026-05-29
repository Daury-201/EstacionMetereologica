package org.example.proyectoIntegrador;

import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
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

        DateTimeFormatter formateadorFecha = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        DateTimeFormatter formatoConsola = DateTimeFormatter.ofPattern("HH:mm:ss");

        try {
            MqttClient cliente = new MqttClient(BROKER, clientId, new MemoryPersistence());
            MqttConnectOptions opciones = new MqttConnectOptions();
            opciones.setUserName(USUARIO);
            opciones.setPassword(CLAVE.toCharArray());
            opciones.setAutomaticReconnect(true);

            cliente.connect(opciones);

            System.out.println("╔══════════════════════════════════════════════════════════════════════════════════════════╗");
            System.out.println("║                       MÓDULO DE TRANSMISIÓN DE SENSORES ACTIVO                           ║");
            System.out.println("╚══════════════════════════════════════════════════════════════════════════════════════════╝\n");

            while (true) {
                climaEstacion1.actualizar();
                climaEstacion2.actualizar();

                EstadoClima[] climas = {climaEstacion1, climaEstacion2};
                String timestampActual = LocalDateTime.now().format(formateadorFecha);
                String horaConsola = LocalDateTime.now().format(formatoConsola);

                for (int i = 0; i < 2; i++) {
                    int numEstacion = i + 1;
                    String base = "/itt363-grupo2/estacion-" + numEstacion + "/sensores/";
                    EstadoClima c = climas[i];

                    publicar(cliente, base + "temperatura", String.format("%.2f", c.temperatura), timestampActual);
                    publicar(cliente, base + "humedad_aire", String.format("%.2f", c.humedadAire), timestampActual);
                    publicar(cliente, base + "presion", String.format("%.2f", c.presion), timestampActual);
                    publicar(cliente, base + "velocidad_viento", String.format("%.2f", c.velocidadViento), timestampActual);
                    publicar(cliente, base + "direccion_viento", c.getDireccionViento(), timestampActual);
                    publicar(cliente, base + "lluvia", String.format("%.2f", c.lluviaAcumulada), timestampActual);
                    publicar(cliente, base + "humedad_suelo", String.format("%.2f", c.humedadSuelo), timestampActual);

                    // Impresión detallada con todos los sensores
                    System.out.printf("[%s] [Estación %d] T: %5.1f°C | H: %5.1f%% | P: %6.1fhPa | V: %4.1fkm/h | Dir: %-2s | L: %4.1fmm | HS: %5.1f%%%n",
                            horaConsola, numEstacion, c.temperatura, c.humedadAire, c.presion, c.velocidadViento, c.getDireccionViento(), c.lluviaAcumulada, c.humedadSuelo);
                }

                System.out.println("────────────────────────────────────────────────────────────────────────────────────────────");
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