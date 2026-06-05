package org.example.proyectoIntegrador;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;

public class LectorEstacion {

    private static final String BD_URL =
            "jdbc:postgresql://127.0.0.1:5432/EstacionMetereologica?currentSchema=public";
    private static final String BD_USUARIO = "java_user";
    private static final String BD_CLAVE = "Daury201";

    private static final DateTimeFormatter FORMATO_SALIDA =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    public static void main(String[] args) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

            server.createContext("/", exchange ->
                    servirArchivo(exchange, "/static/index.html", "text/html; charset=UTF-8"));

            server.createContext("/styles.css", exchange ->
                    servirArchivo(exchange, "/static/styles.css", "text/css; charset=UTF-8"));

            server.createContext("/img.png", exchange ->
                    servirArchivo(exchange, "/img.png", "image/png"));

            server.createContext("/tabla", LectorEstacion::handleTabla);

            server.setExecutor(null);
            server.start();

            try (Connection conn = DriverManager.getConnection(BD_URL, BD_USUARIO, BD_CLAVE)) {
                System.out.println("[!] Servidor web iniciado en puerto 8080.");
                System.out.println("[!] Conexión a PostgreSQL verificada correctamente.");
            }

            System.out.println("╔══════════════════════════════════════════════════════╗");
            System.out.println("║   ESTACION METEOROLOGICA - GRUPO 2 - VISOR WEB      ║");
            System.out.println("╠══════════════════════════════════════════════════════╣");
            System.out.printf("║  Web     : %-41s ║%n", "http://localhost:8080");
            System.out.printf("║  BD      : %-41s ║%n", "EstacionMetereologica");
            System.out.println("╚══════════════════════════════════════════════════════╝");

        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private static void servirArchivo(HttpExchange exchange, String rutaRecurso, String contentType) throws IOException {
        try (InputStream is = LectorEstacion.class.getResourceAsStream(rutaRecurso)) {
            if (is == null) {
                responder(exchange, 404, "Archivo no encontrado: " + rutaRecurso, "text/plain; charset=UTF-8");
                return;
            }

            byte[] contenido = is.readAllBytes();
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, contenido.length);

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(contenido);
            }

        } catch (Exception e) {
            responder(exchange, 500, "Error sirviendo archivo: " + e.getMessage(), "text/plain; charset=UTF-8");
        }
    }

    private static void handleTabla(HttpExchange exchange) throws IOException {
        try {
            StringBuilder filas = new StringBuilder();
            int totalFilas = 0;

            String sql = "SELECT id, estacion_id, fecha_hora, temperatura, humedad_aire, presion, " +
                    "velocidad_viento, direccion_viento, lluvia, humedad_suelo " +
                    "FROM public.lecturas_sensores " +
                    "ORDER BY fecha_hora DESC " +
                    "LIMIT 272";

            try (Connection conn = DriverManager.getConnection(BD_URL, BD_USUARIO, BD_CLAVE);
                 PreparedStatement ps = conn.prepareStatement(sql);
                 ResultSet rs = ps.executeQuery()) {

                while (rs.next()) {
                    long id = rs.getLong("id");
                    int estacionId = rs.getInt("estacion_id");

                    Timestamp ts = rs.getTimestamp("fecha_hora");
                    String fecha = (ts != null)
                            ? ts.toLocalDateTime().format(FORMATO_SALIDA)
                            : "Sin fecha";

                    String temperatura = valorTexto(rs.getObject("temperatura"));
                    String humedadAire = valorTexto(rs.getObject("humedad_aire"));
                    String presion = valorTexto(rs.getObject("presion"));
                    String velocidadViento = valorTexto(rs.getObject("velocidad_viento"));
                    String direccionViento = valorTexto(rs.getObject("direccion_viento"));
                    String lluvia = valorTexto(rs.getObject("lluvia"));
                    String humedadSuelo = valorTexto(rs.getObject("humedad_suelo"));

                    filas.append("<tr>")
                            .append("<td class='id'>").append(id).append("</td>")
                            .append("<td><span class='station'><span class='station-dot'></span>estacion-")
                            .append(estacionId).append("</span></td>")
                            .append("<td class='valor'>").append(escapeHtml(temperatura)).append("</td>")
                            .append("<td class='valor'>").append(escapeHtml(humedadAire)).append("</td>")
                            .append("<td class='valor'>").append(escapeHtml(presion)).append("</td>")
                            .append("<td class='valor'>").append(escapeHtml(velocidadViento)).append("</td>")
                            .append("<td class='valor'>").append(escapeHtml(direccionViento)).append("</td>")
                            .append("<td class='valor'>").append(escapeHtml(lluvia)).append("</td>")
                            .append("<td class='valor'>").append(escapeHtml(humedadSuelo)).append("</td>")
                            .append("<td class='fecha'>").append(escapeHtml(fecha)).append("</td>")
                            .append("</tr>");

                    totalFilas++;
                }
            }

            if (filas.length() == 0) {
                filas.append("<tr><td colspan='10' class='empty-cell'>No hay lecturas disponibles en la base de datos.</td></tr>");
            }

            String json = "{"
                    + "\"totalFilas\":" + totalFilas + ","
                    + "\"filasHtml\":\"" + escapeJson(filas.toString()) + "\""
                    + "}";

            responder(exchange, 200, json, "application/json; charset=UTF-8");

        } catch (Exception e) {
            String json = "{"
                    + "\"totalFilas\":0,"
                    + "\"filasHtml\":\"<tr><td colspan='10' class='empty-cell'>Error cargando datos: "
                    + escapeJson(escapeHtml(e.getMessage()))
                    + "</td></tr>\""
                    + "}";

            responder(exchange, 500, json, "application/json; charset=UTF-8");
            e.printStackTrace();
        }
    }

    private static String valorTexto(Object valor) {
        return valor == null ? "N/D" : valor.toString();
    }

    private static void responder(HttpExchange exchange, int status, String contenido, String contentType) throws IOException {
        byte[] bytes = contenido.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().set("Content-Type", contentType);
        exchange.sendResponseHeaders(status, bytes.length);

        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String escapeHtml(String text) {
        if (text == null) return "";
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private static String escapeJson(String text) {
        if (text == null) return "";
        return text.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "")
                .replace("\r", "");
    }
}