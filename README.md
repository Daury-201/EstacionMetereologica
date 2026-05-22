# Simulación de Estaciones Meteorológicas con MQTT

Sistema desarrollado en Java utilizando el protocolo MQTT para simular múltiples estaciones meteorológicas capaces de transmitir datos ambientales en tiempo real mediante el broker MQTT de la PUCMM.

La asignación implementa el modelo Publisher/Subscriber utilizando la librería Eclipse Paho MQTT y permite monitorear diferentes variables meteorológicas desde consola y mediante herramientas de visualización MQTT.

---

# Descripción General

El sistema simula estaciones meteorológicas capaces de generar y transmitir datos climáticos en tiempo real utilizando MQTT como protocolo de comunicación.

La solución implementa:

- Aplicación Publicadora MQTT.
- Aplicación Suscriptora MQTT.
- Simulación de múltiples estaciones meteorológicas.
- Organización jerárquica de topics MQTT.
- Monitoreo en tiempo real.
- Comunicación IoT utilizando Publisher/Subscriber.

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
- Generación de JAR ejecutables.
- Ejecución sin instalación manual de dependencias.

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
```

---

# Arquitectura MQTT

El sistema utiliza la arquitectura Publisher/Subscriber mediante un broker MQTT centralizado.

```text
SimuladorEstacion → Broker MQTT → LectorEstacion
```

---

# Estructura de Topics

La jerarquía de topics implementada es:

```text
/itt363-grupo2/estacion-X/sensores/tipo_sensor
```

## Ejemplos

```text
/itt363-grupo2/estacion-1/sensores/temperatura
/itt363-grupo2/estacion-1/sensores/humedad_aire
/itt363-grupo2/estacion-2/sensores/presion
/itt363-grupo2/estacion-2/sensores/lluvia
```

El suscriptor escucha todos los mensajes utilizando:

```text
/itt363-grupo2/#
```

---

# Estructura del Proyecto

```text
EstacionMeteorologica/
│
├── README.md
├── pom.xml
├── .gitignore
│
├── docs/
│   └── Reporte Simulacion MQTT.pdf
│
├── release/
│   ├── simulador.jar
│   └── lector.jar
│
└── src/
    └── main/
        └── java/
            └── org/example/proyectoIntegrador/
                ├── SimuladorEstacion.java
                └── LectorEstacion.java
```

---

# Dependencias Maven

El proyecto utiliza Maven para administrar automáticamente las dependencias necesarias.

## Dependencia MQTT

```xml
<dependency>
    <groupId>org.eclipse.paho</groupId>
    <artifactId>org.eclipse.paho.client.mqttv3</artifactId>
    <version>1.2.5</version>
</dependency>
```

---

# Requisitos

- Java JDK 17 o superior
- Windows / Linux / macOS
- Conexión a Internet
- IntelliJ IDEA (Opcional)

---

# Ejecución Rápida

Los archivos JAR ya contienen todas las dependencias necesarias.

No es necesario instalar librerías manualmente.

---

# Ejecutar Publicador MQTT

```bash
java -jar release/simulador.jar
```

La aplicación:

- Simula estaciones meteorológicas.
- Genera datos dinámicos.
- Publica información cada 5 segundos.
- Envía datos mediante MQTT.

---

# Ejecutar Suscriptor MQTT

```bash
java -jar release/lector.jar
```

La aplicación:

- Recibe mensajes MQTT.
- Escucha todos los topics del grupo.
- Procesa automáticamente cada mensaje.
- Muestra información en consola en tiempo real.

---

# Ejemplo de Salida

## Publicador

```text
[Estacion 1] -> T: 28.4°C | H: 71.2% | Viento: NE
```

## Suscriptor

```text
[12:30:15] estacion-1 | temperatura | 28.40 °C
```

---

# Funcionamiento Interno

## SimuladorEstacion

La aplicación publicadora:

- Genera datos meteorológicos simulados.
- Utiliza Random Walk para variaciones graduales.
- Publica datos hacia el broker MQTT.
- Simula múltiples estaciones independientes.

---

## LectorEstacion

La aplicación suscriptora:

- Recibe mensajes MQTT en tiempo real.
- Identifica automáticamente:
    - Estación
    - Sensor
    - Valor
    - Unidad
- Presenta la información organizada en consola.

---

# Calidad de Servicio (QoS)

El sistema utiliza:

```text
QoS 1 - At least once
```

Garantizando que cada mensaje sea entregado al menos una vez al broker MQTT.

---

# MQTT Explorer

Durante las pruebas se utilizó MQTT Explorer para:

- Visualizar la jerarquía de topics.
- Monitorear publicaciones MQTT.
- Validar el funcionamiento del sistema.
- Verificar mensajes en tiempo real.

---


---

# Reporte

El reporte completo de la asignación se encuentra disponible en:

```text
/docs/Reporte_Proyecto_Integrador_MQTT.pdf
```

---

# Repositorio del Proyecto

Repositorio oficial en GitHub:

```text
https://github.com/TU-USUARIO/EstacionMeteorologica
```

---

# Pruebas Realizadas

Se realizaron pruebas de:

- Conexión al broker MQTT.
- Publicación de mensajes.
- Recepción de mensajes.
- Simulación de múltiples estaciones.
- Reconexión automática.
- Visualización mediante MQTT Explorer.
- Ejecución mediante JAR ejecutables.

---

# Integrantes

| Grupo | Asignatura |
|---|---|
| Grupo 2 | Proyecto Integrador |

Pontificia Universidad Católica Madre y Maestra (PUCMM)

---
