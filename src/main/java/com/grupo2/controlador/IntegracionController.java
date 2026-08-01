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
        } else {
            model.addAttribute("pucmmActiva", true); // Default to true as it's a core requirement
            model.addAttribute("pucmmIntervalo", 10);
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
            resp.put("apiKey", "••••••••••••••••");
            return ResponseEntity.ok(resp);
        } else {
            IntegracionConfig vacio = new IntegracionConfig();
            vacio.setPlataforma(plataforma);
            vacio.setActiva("pucmm".equalsIgnoreCase(plataforma)); // Default to true for pucmm
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
        integracionRepository.save(config);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Configuración guardada exitosamente");
        return ResponseEntity.ok(response);
    }
    @PostMapping("/api/integracion/test")
    @ResponseBody
    public ResponseEntity<?> probarConexion(@RequestBody Map<String, String> request) {
        String apiKey = request.get("apiKey");
        Map<String, Object> result = integracionService.testConnection(apiKey);
        return ResponseEntity.ok(result);
    }
    @PostMapping("/api/integracion/sync-now")
    @ResponseBody
    public ResponseEntity<?> sincronizarAhora(@RequestBody Map<String, String> request) {
        String plataforma = request.get("plataforma");
        try {
            integracionService.forzarSincronizacion(plataforma);
            return ResponseEntity.ok(Map.of("success", true, "message", "Sincronización manual iniciada"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }
}
