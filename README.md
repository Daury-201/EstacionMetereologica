# Simulación de Estaciones Meteorológicas con MQTT

Sistema desarrollado en Java utilizando el protocolo MQTT para simular múltiples estaciones meteorológicas capaces de transmitir datos ambientales en tiempo real mediante el broker MQTT de la PUCMM.

La asignación implementa el modelo Publisher/Subscriber utilizando la librería Eclipse Paho MQTT y permite monitorear diferentes variables meteorológicas desde consola y mediante herramientas de visualización MQTT.

---

# Objetivo

Desarrollar un sistema capaz de simular estaciones meteorológicas y transmitir datos meteorológicos en tiempo real utilizando MQTT, permitiendo la comunicación entre múltiples estaciones y clientes suscriptores.

---

# Características del Sistema

- Simulación de múltiples estaciones meteorológicas.
- Publicación de datos en tiempo real mediante MQTT.
- Recepción de mensajes mediante suscripción MQTT.
- Organización jerárquica de topics.
- Reconexión automática al broker.
- Implementación de QoS 1.
- Monitoreo mediante MQTT Explorer.
- Arquitectura escalable orientada a IoT.

---

# Sensores Simulados

El sistema genera datos simulados para los siguientes sensores:

| Sensor | Unidad |
|---|---|
| Temperatura | °C |
| Humedad del aire | % |
| Presión atmosférica | hPa |
| Velocidad del viento | km/h |
| Dirección del viento | Cardinal |
| Lluvia acumulada | mm |
| Humedad del suelo | % |

---

# Tecnologías Utilizadas

| Tecnología | Uso |
|---|---|
| Java | Lenguaje principal |
| Maven | Gestión de dependencias |
| MQTT | Comunicación IoT |
| Eclipse Paho MQTT | Cliente MQTT |
| IntelliJ IDEA | Entorno de desarrollo |
| MQTT Explorer | Monitoreo MQTT |
| GitHub | Control de versiones |

---

# Broker MQTT Utilizado

```text
Servidor : mqtt.eict.ce.pucmm.edu.do
Puerto   : 1883
Usuario  : itt363-grupo2