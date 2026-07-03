package com.grupo2.controlador;
import com.grupo2.entidad.IntegracionSyncLog;
import com.grupo2.repositorio.IntegracionSyncLogRepository;
import com.grupo2.servicio.AlarmaService;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;
import java.time.LocalDateTime;
@ControllerAdvice
public class GlobalControllerAdvice {
    private final AlarmaService alarmaService;
    private final IntegracionSyncLogRepository syncLogRepository;
    public GlobalControllerAdvice(AlarmaService alarmaService, IntegracionSyncLogRepository syncLogRepository) {
        this.alarmaService = alarmaService;
        this.syncLogRepository = syncLogRepository;
    }
    @ModelAttribute("totalAlarmasActivas")
    public long totalAlarmasActivas() {
        return alarmaService.contarActivas();
    }
    @ModelAttribute("ultimaSincronizacionGlobal")
    public LocalDateTime ultimaSincronizacionGlobal() {
        IntegracionSyncLog ultimaSync = syncLogRepository.findTop1ByOrderByFechaHoraDesc();
        return ultimaSync != null ? ultimaSync.getFechaHora() : null;
    }
}
