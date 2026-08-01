package com.grupo2.controlador;
import com.grupo2.entidad.IntegracionConfig;
import com.grupo2.entidad.IntegracionSyncLog;
import com.grupo2.repositorio.EstacionRepository;
import com.grupo2.repositorio.IntegracionRepository;
import com.grupo2.repositorio.IntegracionSyncLogRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import com.grupo2.servicio.IntegracionService;
@Controller
public class IntegracionController {
    private final IntegracionRepository integracionRepository;
    private final IntegracionSyncLogRepository syncLogRepository;
    private final EstacionRepository estacionRepository;
    private final IntegracionService integracionService;
    public IntegracionController(IntegracionRepository integracionRepository,
                                 IntegracionSyncLogRepository syncLogRepository,
                                 EstacionRepository estacionRepository,
                                 IntegracionService integracionService) {
        this.integracionRepository = integracionRepository;
        this.syncLogRepository = syncLogRepository;
        this.estacionRepository = estacionRepository;
        this.integracionService = integracionService;
    }
    @GetMapping("/integracion")
    public String integracion(Model model) {
        model.addAttribute("estaciones", estacionRepository.findAll());
        model.addAttribute("syncLogs", syncLogRepository.findTop20ByOrderByFechaHoraDesc());
        long syncsHoy = syncLogRepository.countByFechaHoraAfter(LocalDateTime.now().toLocalDate().atStartOfDay());
        model.addAttribute("syncsHoy", syncsHoy);
        List<IntegracionConfig> activas = integracionRepository.findByActivaTrue();
        model.addAttribute("plataformasConectadas", activas.size());
        IntegracionSyncLog ultimaSync = syncLogRepository.findTop1ByOrderByFechaHoraDesc();
        if (ultimaSync != null) {
            model.addAttribute("ultimaSincronizacion", ultimaSync.getFechaHora());
        } else {
            model.addAttribute("ultimaSincronizacion", null);
        }
        Optional<IntegracionConfig> owmConfig = integracionRepository.findByPlataformaIgnoreCase("openweathermap");
        if (owmConfig.isPresent()) {
            IntegracionConfig cfg = owmConfig.get();
            model.addAttribute("owmActiva", cfg.getActiva() != null && cfg.getActiva());
            model.addAttribute("owmApiKey", "••••••••••••••••");
            model.addAttribute("owmIntervalo", cfg.getIntervaloMin() != null ? cfg.getIntervaloMin() : 10);
            model.addAttribute("owmEstacionesIds", cfg.getEstacionesIds());
        } else {
            model.addAttribute("owmActiva", false);
            model.addAttribute("owmApiKey", "••••••••••••••••");
            model.addAttribute("owmIntervalo", 10);
            model.addAttribute("owmEstacionesIds", null);
        }

        Optional<IntegracionConfig> pucmmConfig = integracionRepository.findByPlataformaIgnoreCase("pucmm");
        if (pucmmConfig.isPresent()) {
            IntegracionConfig cfg = pucmmConfig.get();
            model.addAttribute("pucmmActiva", cfg.getActiva() != null && cfg.getActiva());
            model.addAttribute("pucmmIntervalo", cfg.getIntervaloMin() != null ? cfg.getIntervaloMin() : 10);
            model.addAttribute("pucmmEstacionesIds", cfg.getEstacionesIds());
            model.addAttribute("pucmmUrl", cfg.getWebhookUrl() != null ? cfg.getWebhookUrl() : "https://itt363-hub.eict.ce.pucmm.edu.do/api/");
            model.addAttribute("pucmmToken", cfg.getToken() != null ? cfg.getToken() : "bDYmf63tj6v2");
        } else {
            model.addAttribute("pucmmActiva", true); // Default to true as it's a core requirement
            model.addAttribute("pucmmIntervalo", 10);
            model.addAttribute("pucmmEstacionesIds", null);
            model.addAttribute("pucmmUrl", "https://itt363-hub.eict.ce.pucmm.edu.do/api/");
            model.addAttribute("pucmmToken", "bDYmf63tj6v2");
        }

        return "integracion";
    }
    @GetMapping("/api/integracion/estado/{plataforma}")
    @ResponseBody
    public ResponseEntity<?> getEstado(@PathVariable String plataforma) {
        Optional<IntegracionConfig> config = integracionRepository.findByPlataformaIgnoreCase(plataforma);
        if (config.isPresent()) {
            IntegracionConfig cfg = config.get();
            Map<String, Object> resp = new HashMap<>();
            resp.put("id", cfg.getId());
            resp.put("plataforma", cfg.getPlataforma());
            resp.put("activa", cfg.getActiva());
            resp.put("intervaloMin", cfg.getIntervaloMin());
            resp.put("estacionesIds", cfg.getEstacionesIds());
            resp.put("webhookUrl", cfg.getWebhookUrl() != null ? cfg.getWebhookUrl() : "pucmm".equalsIgnoreCase(plataforma) ? "https://itt363-hub.eict.ce.pucmm.edu.do/api/" : "");
            resp.put("token", cfg.getToken() != null ? cfg.getToken() : "pucmm".equalsIgnoreCase(plataforma) ? "bDYmf63tj6v2" : "");
            resp.put("apiKey", "••••••••••••••••");
            return ResponseEntity.ok(resp);
        } else {
            IntegracionConfig vacio = new IntegracionConfig();
            vacio.setPlataforma(plataforma);
            vacio.setActiva("pucmm".equalsIgnoreCase(plataforma)); // Default to true for pucmm
            if ("pucmm".equalsIgnoreCase(plataforma)) {
                vacio.setWebhookUrl("https://itt363-hub.eict.ce.pucmm.edu.do/api/");
                vacio.setToken("bDYmf63tj6v2");
            }
            return ResponseEntity.ok(vacio);
        }
    }
    @PostMapping("/api/integracion/guardar")
    @ResponseBody
    public ResponseEntity<?> guardarConfiguracion(@RequestBody IntegracionConfig request) {
        Optional<IntegracionConfig> existente = integracionRepository.findByPlataformaIgnoreCase(request.getPlataforma());
        IntegracionConfig config;
        if (existente.isPresent()) {
            config = existente.get();
        } else {
            config = new IntegracionConfig();
            config.setPlataforma(request.getPlataforma());
        }
        config.setIntervaloMin(request.getIntervaloMin());
        config.setEstacionesIds(request.getEstacionesIds());
        config.setActiva(request.getActiva());
        if (request.getWebhookUrl() != null && !request.getWebhookUrl().isEmpty()) config.setWebhookUrl(request.getWebhookUrl());
        if (request.getToken() != null && !request.getToken().isEmpty()) config.setToken(request.getToken());
        integracionRepository.save(config);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Configuración guardada exitosamente");
        return ResponseEntity.ok(response);
    }
    @PostMapping("/api/integracion/test")
    @ResponseBody
    public ResponseEntity<?> probarConexion(@RequestBody Map<String, String> request) {
        String plataforma = request.getOrDefault("plataforma", "openweathermap");
        if ("pucmm".equalsIgnoreCase(plataforma)) {
            String url = request.getOrDefault("webhookUrl", "https://itt363-hub.eict.ce.pucmm.edu.do/api/");
            String token = request.getOrDefault("token", "bDYmf63tj6v2");
            com.grupo2.modelo.LecturaSensor dummy = new com.grupo2.modelo.LecturaSensor();
            dummy.setEstacionId(1);
            dummy.setFechaHora(LocalDateTime.now());
            dummy.setTemperatura(25.0);
            dummy.setHumedadAire(50.0);
            boolean ok = integracionService.testPucmmConnection(dummy, url, token);
            Map<String, Object> result = new HashMap<>();
            result.put("success", ok);
            result.put("message", ok ? "Conexión exitosa" : "Fallo al conectar");
            return ResponseEntity.ok(result);
        } else {
            String apiKey = request.get("apiKey");
            Map<String, Object> result = integracionService.testConnection(apiKey);
            return ResponseEntity.ok(result);
        }
    }
    @PostMapping("/api/integracion/sync-now")
    @ResponseBody
    public ResponseEntity<?> sincronizarAhora(@RequestBody Map<String, String> request) {
        String plataforma = request.get("plataforma");
        try {
            if ("pucmm".equalsIgnoreCase(plataforma)) {
                integracionService.forzarSincronizacionPucmm();
            } else {
                integracionService.forzarSincronizacion(plataforma);
            }
            return ResponseEntity.ok(Map.of("success", true, "message", "Sincronización manual iniciada"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
