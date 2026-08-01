package com.grupo2.servicio;

import com.grupo2.modelo.LecturaSensor;
import com.grupo2.entidad.IntegracionConfig;
import com.grupo2.repositorio.IntegracionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class PucmmHubService {

    @Value("${pucmm.hub.url:https://itt363-hub.eict.ce.pucmm.edu.do/api/}")
    private String apiUrl;

    @Value("${pucmm.hub.token:bDYmf63tj6v2}")
    private String token;

    private final RestTemplate restTemplate;
    private final IntegracionRepository integracionRepository;
    private final JdbcTemplate jdbcTemplate;
    private static final DateTimeFormatter FORMATO_FECHA_API = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    public PucmmHubService(IntegracionRepository integracionRepository, JdbcTemplate jdbcTemplate) {
        this.restTemplate = new RestTemplate();
        this.integracionRepository = integracionRepository;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Scheduled(fixedDelay = 60000) // Check every minute
    public void procesarBatch() {
        Optional<IntegracionConfig> configOpt = integracionRepository.findByPlataformaIgnoreCase("pucmm");
        if (configOpt.isEmpty()) return;
        IntegracionConfig config = configOpt.get();
        if (config.getActiva() == null || !config.getActiva()) return;

        LocalDateTime ultimaSync = config.getUltimaSincronizacion();
        Integer intervalo = config.getIntervaloMin() != null ? config.getIntervaloMin() : 10;

        if (ultimaSync == null || ultimaSync.plusMinutes(intervalo).isBefore(LocalDateTime.now())) {
            enviarBatchAhora(config);
        }
    }

    public void enviarBatchAhora(IntegracionConfig config) {
        LocalDateTime desde = config.getUltimaSincronizacion() != null ? config.getUltimaSincronizacion() : LocalDateTime.now().minusHours(1);
        LocalDateTime hasta = LocalDateTime.now();
        
        String url = (config.getWebhookUrl() != null && !config.getWebhookUrl().isEmpty()) ? config.getWebhookUrl() : apiUrl;
        String tokenAuth = (config.getToken() != null && !config.getToken().isEmpty()) ? config.getToken() : token;

        List<Integer> estaciones = null;
        if (config.getEstacionesIds() != null && !config.getEstacionesIds().trim().isEmpty()) {
            estaciones = Arrays.stream(config.getEstacionesIds().split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Integer::parseInt)
                    .collect(Collectors.toList());
        }

        String sql = "SELECT * FROM lecturas WHERE fecha_hora > ? AND fecha_hora <= ? " +
                     (estaciones != null && !estaciones.isEmpty() ? "AND estacion_id IN (" + estaciones.stream().map(String::valueOf).collect(Collectors.joining(",")) + ") " : "") +
                     "ORDER BY fecha_hora ASC";

        List<LecturaSensor> lecturas = jdbcTemplate.query(sql, (rs, rowNum) -> {
            LecturaSensor l = new LecturaSensor();
            l.setId(rs.getLong("id"));
            l.setEstacionId(rs.getInt("estacion_id"));
            l.setFechaHora(rs.getTimestamp("fecha_hora").toLocalDateTime());
            double v;
            v = rs.getDouble("temperatura");
            l.setTemperatura(rs.wasNull() ? null : v);
            v = rs.getDouble("humedad_aire");
            l.setHumedadAire(rs.wasNull() ? null : v);
            return l;
        }, java.sql.Timestamp.valueOf(desde), java.sql.Timestamp.valueOf(hasta));

        int enviados = 0;
        for (LecturaSensor lectura : lecturas) {
            if (enviarLectura(lectura, url, tokenAuth)) {
                enviados++;
            }
        }

        System.out.println("[API PUCMM] Batch completado. Lecturas enviadas: " + enviados);
        config.setUltimaSincronizacion(hasta);
        integracionRepository.save(config);
    }

    public boolean enviarLectura(LecturaSensor lectura, String endpoint, String auth) {
        try {
            // Preparar los headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("SEGURIDAD-TOKEN", auth);

            Map<String, Object> body = new HashMap<>();
            body.put("grupo", "2"); 
            body.put("estacion", String.valueOf(lectura.getEstacionId()));
            body.put("fecha", lectura.getFechaHora().format(FORMATO_FECHA_API));
            body.put("temperatura", lectura.getTemperatura() != null ? lectura.getTemperatura() : 0.0);
            body.put("humedad", lectura.getHumedadAire() != null ? lectura.getHumedadAire() : 0.0);

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(endpoint, requestEntity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                return true;
            } else {
                System.err.println("[API PUCMM] Fallo al enviar al HUB. Status: " + response.getStatusCode().value());
                return false;
            }
        } catch (Exception e) {
            System.err.println("[API PUCMM] Error de conexión: " + e.getMessage());
            return false;
        }
    }
}
