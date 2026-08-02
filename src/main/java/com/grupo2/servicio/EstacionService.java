package com.grupo2.servicio;
import com.grupo2.entidad.Alarma;
import com.grupo2.entidad.Estacion;
import com.grupo2.entidad.LecturaSensores;
import com.grupo2.repositorio.AlarmaRepository;
import com.grupo2.repositorio.EstacionRepository;
import com.grupo2.repositorio.LecturaSensoresRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;

@Service
public class EstacionService {
    @Autowired
    private EstacionRepository estacionRepository;
    @Autowired
    private LecturaSensoresRepository lecturaRepository;
    @Autowired
    private AlarmaRepository alarmaRepository;
    @Autowired
    private ConfiguracionService configuracionService;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Autowired
    private NotificacionService notificacionService;

    private List<EstacionDTO> cachedEstaciones = null;
    private long lastEstacionesTime = 0;
    private final java.util.Set<Long> estacionesNotificadasDesconexion = java.util.concurrent.ConcurrentHashMap.newKeySet();

    public synchronized List<EstacionDTO> obtenerTodasConUltimaLectura() {
        if (System.currentTimeMillis() - lastEstacionesTime > 2000) {
            List<Estacion> estaciones = estacionRepository.findAll();
            List<EstacionDTO> resultado = new ArrayList<>();
        for (Estacion est : estaciones) {
            EstacionDTO dto = new EstacionDTO();
            dto.setId(est.getId());
            dto.setCodigo(est.getCodigo());
            dto.setNombre(est.getNombre());
            dto.setUbicacion(est.getUbicacion());
            dto.setEstado(est.getEstado());
            dto.setLatitud(est.getLatitud());
            dto.setLongitud(est.getLongitud());
            lecturaRepository.findTopByEstacionIdOrderByFechaHoraDesc(est.getId().intValue())
                .ifPresent(lectura -> {
                    dto.setTemperatura(lectura.getTemperatura());
                    dto.setSensacionTermica(lectura.getSensacionTermica());
                    dto.setHumedadAire(lectura.getHumedadAire());
                    dto.setVelocidadViento(lectura.getVelocidadViento());
                    dto.setPresion(lectura.getPresion());
                    dto.setDireccionViento(lectura.getDireccionViento());
                    dto.setLluvia(lectura.getLluvia());
                    dto.setHumedadSuelo(lectura.getHumedadSuelo());
                    if (lectura.getFechaHora() != null) {
                        java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                        dto.setFechaHoraLectura(lectura.getFechaHora().format(formatter));
                        long minutos = ChronoUnit.MINUTES.between(lectura.getFechaHora(), LocalDateTime.now());
                        dto.setUltimaLectura("Hace " + minutos + " min");
                    }
                    java.util.List<String> alarmas = new java.util.ArrayList<>();
                    alarmaRepository.findByEstacionIdAndResueltaFalse(est.getId().intValue())
                        .forEach(al -> alarmas.add(al.getSensor()));
                    dto.setAlarmasActivas(alarmas);
                });
            resultado.add(dto);
        }
        cachedEstaciones = resultado;
        lastEstacionesTime = System.currentTimeMillis();
    }
        return cachedEstaciones;
    }

    public List<EstacionDTO> obtenerBasico() {
        List<Estacion> estaciones = estacionRepository.findAll();
        List<EstacionDTO> resultado = new ArrayList<>();
        for (Estacion est : estaciones) {
            EstacionDTO dto = new EstacionDTO();
            dto.setId(est.getId());
            dto.setCodigo(est.getCodigo());
            dto.setNombre(est.getNombre());
            dto.setUbicacion(est.getUbicacion());
            dto.setEstado(est.getEstado());
            dto.setLatitud(est.getLatitud());
            dto.setLongitud(est.getLongitud());
            resultado.add(dto);
        }
        return resultado;
    }

    public Estacion guardar(Estacion estacion) {
        return estacionRepository.save(estacion);
    }
    public void eliminar(Long id) {
        estacionRepository.deleteById(id);
    }
    public Estacion obtenerPorId(Long id) {
        return estacionRepository.findById(id).orElse(null);
    }
    public Estacion obtenerPorCodigo(String codigo) {
        return estacionRepository.findByCodigo(codigo).orElse(null);
    }
    private final java.util.Map<Long, java.time.LocalDateTime> ultimoAvisoDesconexion = new java.util.concurrent.ConcurrentHashMap<>();

    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void revisarEstadoEstaciones() {
        int timeoutSenalMin = configuracionService.obtenerConfiguracionActual().getTimeoutSenalMin();
        List<Estacion> estaciones = estacionRepository.findAll();
        
        for (Estacion est : estaciones) {
            lecturaRepository.findTopByEstacionIdOrderByFechaHoraDesc(est.getId().intValue())
                .ifPresentOrElse(lectura -> {
                    long segundos = ChronoUnit.SECONDS.between(lectura.getFechaHora(), LocalDateTime.now());
                    
                    Integer valor = configuracionService.obtenerConfiguracionActual().getTimeoutSenalValor();
                    String unidad = configuracionService.obtenerConfiguracionActual().getTimeoutSenalUnidad();
                    long timeoutSegundos = "minutos".equalsIgnoreCase(unidad) ? (valor * 60L) : valor.longValue();
                    
                    if (segundos >= timeoutSegundos) {
                        boolean canNotify = true;
                        if (ultimoAvisoDesconexion.containsKey(est.getId())) {
                            long minutesSinceLastNotify = ChronoUnit.MINUTES.between(ultimoAvisoDesconexion.get(est.getId()), LocalDateTime.now());
                            if (minutesSinceLastNotify < 60) {
                                canNotify = false;
                            }
                        }

                        if (!"Sin señal".equals(est.getEstado())) {
                            est.setEstado("Sin señal");
                            estacionRepository.save(est);
                            EstacionDTO dto = new EstacionDTO();
                            dto.setId(est.getId());
                            dto.setEstado("Sin señal");
                            messagingTemplate.convertAndSend("/topic/estaciones-estado", dto);
                        }

                        if (canNotify) {
                            notificacionService.notificarDesconexion(est);
                            ultimoAvisoDesconexion.put(est.getId(), LocalDateTime.now());
                        }
                    } else {
                        if (!"En línea".equals(est.getEstado())) {
                            est.setEstado("En línea");
                            estacionRepository.save(est);
                            EstacionDTO dto = new EstacionDTO();
                            dto.setId(est.getId());
                            dto.setEstado("En línea");
                            messagingTemplate.convertAndSend("/topic/estaciones-estado", dto);
                        }
                    }
                }, () -> {
                    boolean canNotify = true;
                    if (ultimoAvisoDesconexion.containsKey(est.getId())) {
                        long minutesSinceLastNotify = ChronoUnit.MINUTES.between(ultimoAvisoDesconexion.get(est.getId()), LocalDateTime.now());
                        if (minutesSinceLastNotify < 60) {
                            canNotify = false;
                        }
                    }

                    if (!"Sin señal".equals(est.getEstado())) {
                        est.setEstado("Sin señal");
                        estacionRepository.save(est);
                        EstacionDTO dto = new EstacionDTO();
                        dto.setId(est.getId());
                        dto.setEstado("Sin señal");
                        messagingTemplate.convertAndSend("/topic/estaciones-estado", dto);
                    }

                    if (canNotify) {
                        notificacionService.notificarDesconexion(est);
                        ultimoAvisoDesconexion.put(est.getId(), LocalDateTime.now());
                    }
                });
        }
    }
}
