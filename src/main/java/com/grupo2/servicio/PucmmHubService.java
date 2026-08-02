package com.grupo2.servicio;

import com.grupo2.modelo.LecturaSensor;
import com.grupo2.entidad.IntegracionConfig;
import com.grupo2.entidad.IntegracionSyncLog;
import com.grupo2.repositorio.IntegracionRepository;
import com.grupo2.repositorio.IntegracionSyncLogRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.messaging.simp.SimpMessagingTemplate;

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
    private final IntegracionSyncLogRepository syncLogRepository;
    private final JdbcTemplate jdbcTemplate;
    private final SimpMessagingTemplate messagingTemplate;
    private static final DateTimeFormatter FORMATO_FECHA_API = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    public PucmmHubService(IntegracionRepository integracionRepository, 
                           IntegracionSyncLogRepository syncLogRepository,
                           JdbcTemplate jdbcTemplate,
                           SimpMessagingTemplate messagingTemplate) {
        this.restTemplate = new RestTemplate();
        this.integracionRepository = integracionRepository;
        this.syncLogRepository = syncLogRepository;
        this.jdbcTemplate = jdbcTemplate;
        this.messagingTemplate = messagingTemplate;
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

    private final java.util.concurrent.atomic.AtomicBoolean syncInProgress = new java.util.concurrent.atomic.AtomicBoolean(false);

    public void enviarBatchAhora(IntegracionConfig config) {
        if (!syncInProgress.compareAndSet(false, true)) {
            System.out.println("[API PUCMM] Sincronización ya en progreso. Saltando petición concurrente.");
            return;
        }

        try {
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

        String sql = "SELECT * FROM lecturas_sensores WHERE (enviado_pucmm IS NULL OR enviado_pucmm = false) " +
                     (estaciones != null && !estaciones.isEmpty() ? "AND estacion_id IN (" + estaciones.stream().map(String::valueOf).collect(Collectors.joining(",")) + ") " : "") +
                     "ORDER BY id ASC LIMIT 500"; // Procesar máximo 500 por lote para no saturar

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
        });

        int enviados = 0;
        List<Long> sentIds = new java.util.ArrayList<>();
        for (LecturaSensor lectura : lecturas) {
            if (enviarLectura(lectura, url, tokenAuth)) {
                enviados++;
                sentIds.add(lectura.getId());
            }
        }
        
        if (!sentIds.isEmpty()) {
            String idsStr = sentIds.stream().map(String::valueOf).collect(Collectors.joining(","));
            jdbcTemplate.update("UPDATE lecturas_sensores SET enviado_pucmm = true WHERE id IN (" + idsStr + ")");
        }

        System.out.println("[API PUCMM] Batch completado. Lecturas enviadas: " + enviados);
        config.setUltimaSincronizacion(hasta);
        integracionRepository.save(config);

        IntegracionSyncLog log = new IntegracionSyncLog();
        log.setFechaHora(hasta);
        log.setPlataforma("PUCMM");
        
        String estacionNombreResolved = "Todas las estaciones";
        if (estaciones != null && !estaciones.isEmpty()) {
            try {
                String ids = estaciones.stream().map(String::valueOf).collect(Collectors.joining(","));
                List<String> nombres = jdbcTemplate.queryForList("SELECT nombre FROM estaciones WHERE id IN (" + ids + ")", String.class);
                if (!nombres.isEmpty()) {
                    estacionNombreResolved = String.join(", ", nombres);
                } else {
                    estacionNombreResolved = "Estaciones " + estaciones.toString();
                }
            } catch (Exception e) {
                estacionNombreResolved = "Estaciones " + estaciones.toString();
            }
        }
        log.setEstacionNombre(estacionNombreResolved);
        log.setRegistrosEnviados(enviados);
        if (enviados > 0) {
            log.setEstado("EXITOSO");
            log.setMensaje("Sincronización completa con Hub PUCMM");
        } else if (!lecturas.isEmpty()) {
            log.setEstado("ERROR");
            log.setMensaje("Fallo al enviar lecturas al Hub PUCMM");
        } else {
            log.setEstado("EXITOSO");
            log.setMensaje("No hay datos nuevos para enviar");
        }
        syncLogRepository.save(log);

        try {
            java.util.Map<String, Object> wsPayload = new java.util.HashMap<>();
            wsPayload.put("fechaHora", log.getFechaHora().toString());
            wsPayload.put("plataforma", log.getPlataforma());
            wsPayload.put("estacionNombre", log.getEstacionNombre());
            wsPayload.put("registrosEnviados", log.getRegistrosEnviados());
            wsPayload.put("estado", log.getEstado());
            wsPayload.put("mensaje", log.getMensaje());
            wsPayload.put("syncsHoy", syncLogRepository.countByFechaHoraAfter(hasta.toLocalDate().atStartOfDay()));
            wsPayload.put("plataformasConectadas", integracionRepository.findByActivaTrue().size());
            wsPayload.put("ultimaSincronizacion", hasta.toString());
            messagingTemplate.convertAndSend("/topic/integracion", (Object) wsPayload);
        } catch (Exception e) {
            System.err.println("Error al enviar WebSocket de integración: " + e.getMessage());
        }
        } finally {
            syncInProgress.set(false);
        }
    }

    public boolean enviarLectura(LecturaSensor lectura, String endpoint, String auth) {
        try {
            // Preparar los headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("SEGURIDAD-TOKEN", auth);

            Map<String, Object> body = new HashMap<>();
            body.put("grupo", 2); 
            body.put("estacion", lectura.getEstacionId());
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
