package com.grupo2.servicio;
import com.grupo2.entidad.Alarma;
import com.grupo2.entidad.Estacion;
import com.grupo2.entidad.Umbral;
import com.grupo2.repositorio.AlarmaRepository;
import com.grupo2.repositorio.EstacionRepository;
import com.grupo2.repositorio.UmbralRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
@Service
public class AlarmaService {
    private final AlarmaRepository alarmaRepository;
    private final UmbralRepository umbralRepository;
    private final EstacionRepository estacionRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificacionService notificacionService;
    public AlarmaService(AlarmaRepository alarmaRepository,
                          UmbralRepository umbralRepository,
                          EstacionRepository estacionRepository,
                          SimpMessagingTemplate messagingTemplate,
                          NotificacionService notificacionService) {
        this.alarmaRepository = alarmaRepository;
        this.umbralRepository = umbralRepository;
        this.estacionRepository = estacionRepository;
        this.messagingTemplate = messagingTemplate;
        this.notificacionService = notificacionService;
    }
    private static final Map<String, Double> MARGENES_ADVERTENCIA = new HashMap<>();
    static {
        MARGENES_ADVERTENCIA.put("temperatura", 2.0);      
        MARGENES_ADVERTENCIA.put("humedad_aire", 5.0);     
        MARGENES_ADVERTENCIA.put("humedad_suelo", 5.0);    
        MARGENES_ADVERTENCIA.put("velocidad_viento", 10.0); 
        MARGENES_ADVERTENCIA.put("lluvia", 5.0);           
        MARGENES_ADVERTENCIA.put("presion", 10.0);         
    }
    private final Map<String, Integer> lecturasAnormales = new java.util.concurrent.ConcurrentHashMap<>();
    private static final int LECTURAS_REQUERIDAS = 3;
    @Transactional
    public void evaluarSensor(int estacionId, String sensor, Double valor) {
        if (valor == null) return;
        Optional<Umbral> umbralOpt = umbralRepository.findByEstacionIdAndSensor(estacionId, sensor);
        if (umbralOpt.isEmpty()) {
            umbralOpt = umbralRepository.findByEstacionIdAndSensor(null, sensor);
        }
        if (umbralOpt.isEmpty()) return;
        Umbral umbral = umbralOpt.get();
        String gravedad = null;
        String detalleUmbral = "";
        Double critMax = umbral.getCritMaxValor();
        Double critMin = umbral.getCritMinValor();
        Double advMax = umbral.getAdvMaxValor();
        Double advMin = umbral.getAdvMinValor();
        if (critMax != null && valor >= critMax) {
            gravedad = "CRITICA";
            detalleUmbral = ">= " + critMax + getUnidad(sensor);
        } else if (critMin != null && valor <= critMin) {
            gravedad = "CRITICA";
            detalleUmbral = "<= " + critMin + getUnidad(sensor);
        }
        else if (advMax != null && valor >= advMax) {
            gravedad = "ADVERTENCIA";
            detalleUmbral = ">= " + advMax + getUnidad(sensor);
        } else if (advMin != null && valor <= advMin) {
            gravedad = "ADVERTENCIA";
            detalleUmbral = "<= " + advMin + getUnidad(sensor);
        }
        String cacheKey = estacionId + "_" + sensor;
        if (gravedad != null) {
            int conteoActual = lecturasAnormales.getOrDefault(cacheKey, 0) + 1;
            lecturasAnormales.put(cacheKey, conteoActual);
            Optional<Alarma> alarmaExistenteOpt = alarmaRepository
                    .findFirstByEstacionIdAndSensorAndResueltaFalse(estacionId, sensor);
            if (alarmaExistenteOpt.isPresent()) {
                Alarma alarmaExistente = alarmaExistenteOpt.get();
                if ("ADVERTENCIA".equals(alarmaExistente.getGravedad()) && "CRITICA".equals(gravedad)) {
                    alarmaExistente.setGravedad("CRITICA");
                    alarmaExistente.setValor(valor);
                    alarmaExistente.setUmbralExcedido(detalleUmbral);
                    alarmaExistente.setFechaHora(LocalDateTime.now());
                    alarmaExistente.setReconocida(false); 
                    alarmaRepository.save(alarmaExistente);
                    notificarAlarma(alarmaExistente);
                }
            } else {
                if (conteoActual >= LECTURAS_REQUERIDAS) {
                    String estacionNombre = "Estación " + estacionId;
                    Optional<Estacion> estOpt = estacionRepository.findById((long) estacionId);
                    if (estOpt.isPresent()) {
                        estacionNombre = estOpt.get().getNombre();
                    }
                    Alarma nuevaAlarma = new Alarma();
                    nuevaAlarma.setEstacionId(estacionId);
                    nuevaAlarma.setEstacionNombre(estacionNombre);
                    nuevaAlarma.setSensor(sensor);
                    nuevaAlarma.setValor(valor);
                    nuevaAlarma.setUmbralExcedido(detalleUmbral);
                    nuevaAlarma.setGravedad(gravedad);
                    nuevaAlarma.setFechaHora(LocalDateTime.now());
                    nuevaAlarma.setResuelta(false);
                    nuevaAlarma.setReconocida(false);
                    alarmaRepository.save(nuevaAlarma);
                    notificarAlarma(nuevaAlarma);
                    lecturasAnormales.put(cacheKey, 0);
                }
            }
        } else {
            lecturasAnormales.put(cacheKey, 0);
        }
    }

    @Transactional
    public void registrarDesconexion(Estacion estacion) {
        Optional<Alarma> alarmaExistente = alarmaRepository.findFirstByEstacionIdAndSensorAndResueltaFalse(estacion.getId().intValue(), "conexion");
        if (alarmaExistente.isEmpty()) {
            Alarma nuevaAlarma = new Alarma();
            nuevaAlarma.setEstacionId(estacion.getId().intValue());
            nuevaAlarma.setEstacionNombre(estacion.getNombre());
            nuevaAlarma.setSensor("conexion");
            nuevaAlarma.setValor(0.0);
            nuevaAlarma.setUmbralExcedido("Pérdida de señal");
            nuevaAlarma.setGravedad("CRITICA");
            nuevaAlarma.setFechaHora(LocalDateTime.now());
            nuevaAlarma.setResuelta(false);
            nuevaAlarma.setReconocida(false);
            alarmaRepository.save(nuevaAlarma);
            notificarAlarma(nuevaAlarma);
        }
    }

    @Transactional
    public void resolverDesconexion(Estacion estacion) {
        Optional<Alarma> alarmaExistente = alarmaRepository.findFirstByEstacionIdAndSensorAndResueltaFalse(estacion.getId().intValue(), "conexion");
        if (alarmaExistente.isPresent()) {
            resolverAlarma(alarmaExistente.get().getId(), "Señal restablecida automáticamente");
        }
    }
    private void notificarAlarma(Alarma alarma) {
        try {
            messagingTemplate.convertAndSend("/topic/alarmas", alarma);
            if (!alarma.isResuelta()) {
                notificacionService.notificarAlarma(alarma);
            }
        } catch (Exception e) {
            System.err.println("Error enviando alerta: " + e.getMessage());
        }
    }
    private String getUnidad(String sensor) {
        return switch (sensor) {
            case "temperatura" -> " °C";
            case "humedad_aire", "humedad_suelo" -> " %";
            case "presion" -> " hPa";
            case "velocidad_viento" -> " km/h";
            case "lluvia" -> " mm";
            default -> "";
        };
    }
    @Transactional
    public void resolverAlarma(Long id, String notas) {
        Optional<Alarma> alarmaOpt = alarmaRepository.findById(id);
        if (alarmaOpt.isPresent()) {
            Alarma alarma = alarmaOpt.get();
            alarma.setResuelta(true);
            alarma.setFechaHoraResolucion(LocalDateTime.now());
            alarma.setNotas(notas);
            long minutos = Duration.between(alarma.getFechaHora(), alarma.getFechaHoraResolucion()).toMinutes();
            alarma.setDuracionMinutos(Math.max(1, minutos)); 
            alarmaRepository.save(alarma);
            notificarAlarma(alarma);
        }
    }
    @Transactional
    public void reconocerAlarma(Long id, String usuario) {
        Optional<Alarma> alarmaOpt = alarmaRepository.findById(id);
        if (alarmaOpt.isPresent() && !alarmaOpt.get().isResuelta()) {
            Alarma alarma = alarmaOpt.get();
            alarma.setReconocida(true);
            alarma.setReconocidoPor(usuario);
            alarma.setFechaHoraReconocimiento(LocalDateTime.now());
            alarmaRepository.save(alarma);
            notificarAlarma(alarma);
        }
    }
    @Transactional
    public void reconocerMultiples(List<Long> ids, String usuario) {
        for (Long id : ids) {
            reconocerAlarma(id, usuario);
        }
    }
    @Transactional
    public void resolverMultiples(List<Long> ids, String notas) {
        for (Long id : ids) {
            resolverAlarma(id, notas);
        }
    }
    public List<Alarma> filtrarHistorial(String sensor, String gravedad, String fechaInicio, String fechaFin) {
        List<Alarma> todas = alarmaRepository.findByResueltaTrueOrderByFechaHoraResolucionDesc();
        return todas.stream().filter(a -> {
            boolean match = true;
            if (sensor != null && !sensor.isEmpty() && !sensor.equals("todos")) {
                match = a.getSensor().equalsIgnoreCase(sensor);
            }
            if (match && gravedad != null && !gravedad.isEmpty() && !gravedad.equals("todas")) {
                match = a.getGravedad().equalsIgnoreCase(gravedad);
            }
            if (match && fechaInicio != null && !fechaInicio.isEmpty()) {
                LocalDateTime start = LocalDateTime.parse(fechaInicio + "T00:00:00");
                match = !a.getFechaHora().isBefore(start);
            }
            if (match && fechaFin != null && !fechaFin.isEmpty()) {
                LocalDateTime end = LocalDateTime.parse(fechaFin + "T23:59:59");
                match = !a.getFechaHora().isAfter(end);
            }
            return match;
        }).toList();
    }
    public List<Alarma> obtenerActivas() {
        return alarmaRepository.findByResueltaFalseOrderByFechaHoraDesc();
    }
    public List<Alarma> obtenerResueltas() {
        return alarmaRepository.findByResueltaTrueOrderByFechaHoraResolucionDesc();
    }
    public long contarActivas() {
        return alarmaRepository.countByResueltaFalse();
    }
    public long contarActivasPorGravedad(String gravedad) {
        return alarmaRepository.countByResueltaFalseAndGravedad(gravedad);
    }
    public long contarResueltas() {
        return alarmaRepository.countByResueltaTrue();
    }
    public List<Umbral> obtenerUmbralesPorEstacion(Integer estacionId) {
        return umbralRepository.findByEstacionId(estacionId);
    }
    @Transactional
    public void guardarUmbrales(List<Umbral> umbrales) {
        for (Umbral u : umbrales) {
            Optional<Umbral> existente = umbralRepository.findByEstacionIdAndSensor(u.getEstacionId(), u.getSensor());
            if (existente.isPresent()) {
                Umbral e = existente.get();
                e.setAdvMinValor(u.getAdvMinValor());
                e.setAdvMaxValor(u.getAdvMaxValor());
                e.setCritMinValor(u.getCritMinValor());
                e.setCritMaxValor(u.getCritMaxValor());
                umbralRepository.save(e);
            } else {
                umbralRepository.save(u);
            }
        }
    }
    public Optional<Alarma> obtenerPorId(Long id) {
        return alarmaRepository.findById(id);
    }
    @Transactional
    public void borrarUmbral(String sensor, Integer estacionId) {
        Optional<Umbral> existente = umbralRepository.findByEstacionIdAndSensor(estacionId, sensor);
        existente.ifPresent(umbralRepository::delete);
    }
}
