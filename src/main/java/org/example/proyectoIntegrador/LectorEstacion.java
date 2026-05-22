package org.example.proyectoIntegrador;

import org.eclipse.paho.client.mqttv3.*;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class LectorEstacion {
    private static final String BROKER       = "tcp://mqtt.eict.ce.pucmm.edu.do:1883";
    private static final String USUARIO      = "itt363-grupo2";
    private static final String CLAVE        = "knDH2P6N4w9g";
    private static final String TOPIC_GLOBAL = "/itt363-grupo2/#";

    private static final DateTimeFormatter FORMATO = DateTimeFormatter.ofPattern("HH:mm:ss");

    public static void main(String[] args) {
        String clientId = "LectorG2-" + System.currentTimeMillis();
        try {
            MqttClient cliente = new MqttClient(BROKER, clientId);
            MqttConnectOptions opciones = new MqttConnectOptions();
            opciones.setUserName(USUARIO);
            opciones.setPassword(CLAVE.toCharArray());
            opciones.setAutomaticReconnect(true);

            cliente.setCallback(new MqttCallback() {
                public void connectionLost(Throwable cause) {
                    System.out.println("[!] Conexión perdida. Reconectando...");
                }

                public void messageArrived(String topic, MqttMessage message) {
                    String valor     = new String(message.getPayload());
                    String hora      = LocalDateTime.now().format(FORMATO);
                    String[] partes  = topic.split("/");
                    String estacion  = partes.length > 2 ? partes[2] : "desconocida";
                    String sensor    = partes.length > 4 ? partes[4] : "desconocido";

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
                            hora, estacion, sensor, valor, unidad);
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