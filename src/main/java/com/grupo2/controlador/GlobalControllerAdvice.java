package com.grupo2.controlador;
import com.grupo2.entidad.IntegracionSyncLog;
import com.grupo2.repositorio.IntegracionSyncLogRepository;
import com.grupo2.servicio.AlarmaService;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import com.grupo2.entidad.Usuario;
import com.grupo2.servicio.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
@ControllerAdvice
public class GlobalControllerAdvice {
    private final AlarmaService alarmaService;
    private final IntegracionSyncLogRepository syncLogRepository;
    private final UsuarioService usuarioService;
    private final com.grupo2.servicio.EstacionService estacionService;
    private final com.grupo2.repositorio.EstacionRepository estacionRepository;
    private final com.grupo2.servicio.ConfiguracionService configuracionService;
    private final com.grupo2.servicio.FormatoService formatoService;

    public GlobalControllerAdvice(AlarmaService alarmaService, IntegracionSyncLogRepository syncLogRepository, UsuarioService usuarioService, com.grupo2.servicio.EstacionService estacionService, com.grupo2.repositorio.EstacionRepository estacionRepository, com.grupo2.servicio.ConfiguracionService configuracionService, com.grupo2.servicio.FormatoService formatoService) {
        this.alarmaService = alarmaService;
        this.syncLogRepository = syncLogRepository;
        this.usuarioService = usuarioService;
        this.estacionService = estacionService;
        this.estacionRepository = estacionRepository;
        this.configuracionService = configuracionService;
        this.formatoService = formatoService;
    }

    
    private boolean isLoginPage(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return uri != null && uri.startsWith("/login");
    }

    private static class CacheGlobal {
        long timestamp;
        long totalAlarmas;
        LocalDateTime ultimaSync;
        long totalEstaciones;
        long activasEstaciones;
        java.util.List<com.grupo2.servicio.EstacionDTO> estaciones;
        com.grupo2.entidad.ConfiguracionSistema configuracion;
    }

    private CacheGlobal cache = new CacheGlobal();

    private synchronized CacheGlobal getCache() {
        if (System.currentTimeMillis() - cache.timestamp > 2000) {
            cache.totalAlarmas = alarmaService.contarActivas();
            IntegracionSyncLog ultima = syncLogRepository.findTop1ByOrderByFechaHoraDesc();
            cache.ultimaSync = ultima != null ? ultima.getFechaHora() : null;
            cache.totalEstaciones = estacionRepository.count();
            cache.activasEstaciones = estacionRepository.countByEstado("En línea");
            cache.estaciones = estacionService.obtenerBasico();
            cache.configuracion = configuracionService.obtenerConfiguracionActual();
            cache.timestamp = System.currentTimeMillis();
        }
        return cache;
    }

    @ModelAttribute("totalAlarmasActivas")
    public long totalAlarmasActivas(HttpServletRequest request) {
        if (isLoginPage(request)) {
            return 0;
        }
        return getCache().totalAlarmas;
    }
    @ModelAttribute("ultimaSincronizacionGlobal")
    public LocalDateTime ultimaSincronizacionGlobal(HttpServletRequest request) {
        if (isLoginPage(request)) {
            return null;
        }
        return getCache().ultimaSync;
    }

    @ModelAttribute("usuarioGlobal")
    public Usuario usuarioGlobal(Authentication authentication, HttpServletRequest request) {
        if (isLoginPage(request)) {
            return null;
        }
        if (authentication != null && authentication.getPrincipal() instanceof UserDetails) {
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            return usuarioService.obtenerPorUsername(userDetails.getUsername());
        }
        return null;
    }

    @ModelAttribute("totalEstacionesGlobal")
    public long totalEstacionesGlobal(HttpServletRequest request) {
        if (isLoginPage(request)) {
            return 0;
        }
        return getCache().totalEstaciones;
    }

    @ModelAttribute("activasEstacionesGlobal")
    public long activasEstacionesGlobal(HttpServletRequest request) {
        if (isLoginPage(request)) {
            return 0;
        }
        return getCache().activasEstaciones;
    }

    @ModelAttribute("estacionesGlobal")
    public java.util.List<com.grupo2.servicio.EstacionDTO> estacionesGlobal(HttpServletRequest request) {
        if (isLoginPage(request)) {
            return new java.util.ArrayList<>();
        }
        return getCache().estaciones;
    }

    @ModelAttribute("configuracionGlobal")
    public com.grupo2.entidad.ConfiguracionSistema configuracionGlobal(HttpServletRequest request) {
        if (isLoginPage(request)) {
            return null;
        }
        return getCache().configuracion;
    }

    @ModelAttribute("formatter")
    public com.grupo2.servicio.FormatoService formatter(HttpServletRequest request) {
        if (isLoginPage(request)) {
            return null;
        }
        return formatoService;
    }
}

