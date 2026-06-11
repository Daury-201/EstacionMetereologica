package com.grupo2.mqtt;

import jakarta.annotation.PostConstruct;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

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

    public LectorEstacion(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private static final DateTimeFormatter FORMATO_ENTRADA =
            DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private static final DateTimeFormatter FORMATO_SALIDA =
            DateTimeFormatter.ofPattern("HH:mm:ss");

    @PostConstruct
    public void iniciar() {

        try {

            System.out.println("[✓] PostgreSQL configurado mediante Spring.");

            /*
             * CONEXIÓN MQTT
             */
            String clientId = "LectorG2-" + System.currentTimeMillis();

            MqttClient cliente = new MqttClient(
                    broker,
                    clientId,
                    new MemoryPersistence()
            );

            MqttConnectOptions opciones = new MqttConnectOptions();

            opciones.setUserName(usuario);
            opciones.setPassword(clave.toCharArray());
            opciones.setAutomaticReconnect(true);
            opciones.setCleanSession(true);

            cliente.setCallback(new MqttCallback() {

                @Override
                public void connectionLost(Throwable cause) {

                    System.out.println(
                            "[!] Conexión MQTT perdida."
                    );
                }

                @Override
                public void messageArrived(
                        String topic,
                        MqttMessage message
                ) {

                    try {

                        String payload =
                                new String(message.getPayload());

                        /*
                         * Formato:
                         * valor|timestamp
                         */
                        String[] partesPayload =
                                payload.split("\\|");

                        if (partesPayload.length != 2) {

                            System.err.println(
                                    "Payload inválido: " + payload
                            );

                            return;
                        }

                        String valor =
                                partesPayload[0];

                        String timestamp =
                                partesPayload[1];

                        LocalDateTime fechaHora =
                                LocalDateTime.parse(
                                        timestamp,
                                        FORMATO_ENTRADA
                                );

                        String hora =
                                fechaHora.format(
                                        FORMATO_SALIDA
                                );

                        /*
                         * Topic:
                         * /itt363-grupo2/estacion-1/sensores/temperatura
                         */
                        String[] partesTopic =
                                topic.split("/");

                        if (partesTopic.length < 5) {

                            System.err.println(
                                    "Topic inválido: " + topic
                            );

                            return;
                        }

                        String estacion =
                                partesTopic[2];

                        String sensor =
                                partesTopic[4];

                        int estacionId =
                                Integer.parseInt(
                                        estacion.replace(
                                                "estacion-",
                                                ""
                                        )
                                );

                        /*
                         * UPSERT
                         */
                        String sql =
                                "INSERT INTO lecturas_sensores " +
                                        "(estacion_id, fecha_hora, " +
                                        sensor +
                                        ") VALUES (?, ?::timestamp, ?) " +
                                        "ON CONFLICT (estacion_id, fecha_hora) " +
                                        "DO UPDATE SET " +
                                        sensor +
                                        " = EXCLUDED." +
                                        sensor;

                        if (sensor.equals("direccion_viento")) {

                            jdbcTemplate.update(
                                    sql,
                                    estacionId,
                                    timestamp,
                                    valor
                            );

                        } else {

                            jdbcTemplate.update(
                                    sql,
                                    estacionId,
                                    timestamp,
                                    Double.parseDouble(valor)
                            );
                        }

                        String unidad =
                                switch (sensor) {

                                    case "temperatura" ->
                                            "°C";

                                    case "humedad_aire",
                                         "humedad_suelo" ->
                                            "%";

                                    case "presion" ->
                                            "hPa";

                                    case "velocidad_viento" ->
                                            "km/h";

                                    case "lluvia" ->
                                            "mm";

                                    default ->
                                            "";
                                };

                        System.out.printf(
                                "[%s] Estación %d | %-20s | %s %s%n",
                                hora,
                                estacionId,
                                sensor,
                                valor,
                                unidad
                        );

                    } catch (Exception e) {

                        System.err.println(
                                "Error guardando lectura: "
                                        + e.getMessage()
                        );
                    }
                }

                @Override
                public void deliveryComplete(
                        IMqttDeliveryToken token
                ) {
                }
            });

            cliente.connect(opciones);

            cliente.subscribe(
                    topicGlobal,
                    1
            );

            System.out.println(
                    "[✓] MQTT conectado."
            );

            System.out.println(
                    "[✓] Escuchando: " +
                            topicGlobal
            );

        } catch (Exception e) {

            System.err.println(
                    "[X] Error iniciando LectorEstacion:"
            );

            e.printStackTrace();
        }
    }
}