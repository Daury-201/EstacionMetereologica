package com.grupo2.servicio;
import com.grupo2.entidad.Estacion;
import com.grupo2.entidad.IntegracionConfig;
import com.grupo2.entidad.IntegracionSyncLog;
import com.grupo2.entidad.LecturaSensores;
import com.grupo2.repositorio.EstacionRepository;
import com.grupo2.repositorio.IntegracionRepository;
import com.grupo2.repositorio.IntegracionSyncLogRepository;
import com.grupo2.repositorio.LecturaSensoresRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Collections;
@Service
public class IntegracionService {
    @Autowired
    private IntegracionRepository integracionRepository;
    @Autowired
    private IntegracionSyncLogRepository syncLogRepository;
    @Autowired
    private EstacionRepository estacionRepository;
    @Autowired
    private LecturaSensoresRepository lecturaRepository;
    @Autowired
    private AlarmaService alarmaService;
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    @Value("${api.openweathermap.key}")
    private String openWeatherMapApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    
    public String obtenerPronosticoOWM(Long estacionId) {
        return estacionRepository.findById(estacionId).map(est -> {
            String url = String.format("https://api.openweathermap.org/data/2.5/forecast?lat=%s&lon=%s&appid=%s&units=metric",
                    est.getLatitud(), est.getLongitud(), openWeatherMapApiKey);
            try {
                return restTemplate.getForObject(url, String.class);
            } catch (Exception e) {
                e.printStackTrace();
                return "{}";
            }
        }).orElse("{}");
    }

    private List<Map<String, Object>> cachedForecast = null;
    private LocalDateTime lastForecastTime = null;
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void procesarSincronizaciones() {
        List<IntegracionConfig> configsActivas = integracionRepository.findByActivaTrue();
        for (IntegracionConfig config : configsActivas) {
            if ("openweathermap".equalsIgnoreCase(config.getPlataforma())) {
                boolean debeSincronizar = false;
                if (config.getUltimaSincronizacion() == null) {
                    debeSincronizar = true;
                } else {
                    long minutosTranscurridos = ChronoUnit.MINUTES.between(config.getUltimaSincronizacion(), LocalDateTime.now());
                    if (minutosTranscurridos >= config.getIntervaloMin()) {
                        debeSincronizar = true;
                    }
                }
                if (debeSincronizar) {
                    sincronizarOpenWeatherMap(config);
                }
            }
        }
    }
    @Transactional
    public void forzarSincronizacion(String plataforma) {
        Optional<IntegracionConfig> configOpt = integracionRepository.findByPlataformaIgnoreCase(plataforma);
        if (configOpt.isPresent() && configOpt.get().getActiva()) {
            sincronizarOpenWeatherMap(configOpt.get());
        }
    }
    public Map<String, Object> testConnection(String apiKey) {
        Map<String, Object> resultado = new java.util.HashMap<>();
        try {
            String url = String.format("https://api.openweathermap.org/data/2.5/weather?lat=18.4861&lon=-69.9312&appid=%s&units=metric", openWeatherMapApiKey);
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                resultado.put("success", true);
                resultado.put("message", "Conexión exitosa con OpenWeatherMap");
            } else {
                resultado.put("success", false);
                resultado.put("message", "Error en respuesta: " + response.getStatusCode());
            }
        } catch (Exception e) {
            resultado.put("success", false);
            resultado.put("message", "API Key inválida o error de conexión: " + e.getMessage());
        }
        return resultado;
    }
    private void sincronizarOpenWeatherMap(IntegracionConfig config) {
        List<Estacion> estaciones = new java.util.ArrayList<>();
        if (config.getEstacionesIds() != null && !config.getEstacionesIds().trim().isEmpty()) {
            String[] idsStr = config.getEstacionesIds().split(",");
            for (String idStr : idsStr) {
                try {
                    Long id = Long.parseLong(idStr.trim());
                    estacionRepository.findById(id).ifPresent(estaciones::add);
                } catch (NumberFormatException ignored) {}
            }
        } else {
            estaciones = estacionRepository.findAll();
        }
        int exitosos = 0;
        int fallidos = 0;
        StringBuilder mensajeError = new StringBuilder();
        for (Estacion est : estaciones) {
            if (est.getLatitud() == null || est.getLongitud() == null) {
                fallidos++;
                mensajeError.append("Estación ").append(est.getNombre()).append(" no tiene coordenadas. ");
                continue;
            }
            try {
                String url = String.format("https://api.openweathermap.org/data/2.5/weather?lat=%s&lon=%s&appid=%s&units=metric",
                        est.getLatitud(), est.getLongitud(), openWeatherMapApiKey);
                ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
                if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                    Map<String, Object> body = response.getBody();
                    LecturaSensores lectura = new LecturaSensores();
                    lectura.setEstacionId(est.getId().intValue());
                    lectura.setFechaHora(LocalDateTime.now());
                    if (body.containsKey("main")) {
                        Map<String, Object> main = (Map<String, Object>) body.get("main");
                        if (main.containsKey("temp")) lectura.setTemperatura(Double.valueOf(main.get("temp").toString()));
                        if (main.containsKey("feels_like")) lectura.setSensacionTermica(Double.valueOf(main.get("feels_like").toString()));
                        if (main.containsKey("humidity")) lectura.setHumedadAire(Double.valueOf(main.get("humidity").toString()));
                        if (main.containsKey("pressure")) lectura.setPresion(Double.valueOf(main.get("pressure").toString()));
                    }
                    if (body.containsKey("wind")) {
                        Map<String, Object> wind = (Map<String, Object>) body.get("wind");
                        if (wind.containsKey("speed")) lectura.setVelocidadViento(Double.valueOf(wind.get("speed").toString()));
                        if (wind.containsKey("deg")) {
                            double deg = Double.parseDouble(wind.get("deg").toString());
                            lectura.setDireccionViento(convertirGradosADireccion(deg));
                        }
                    }
                    if (body.containsKey("rain")) {
                        Map<String, Object> rain = (Map<String, Object>) body.get("rain");
                        if (rain.containsKey("1h")) lectura.setLluvia(Double.valueOf(rain.get("1h").toString()));
                    } else {
                        lectura.setLluvia(0.0);
                    }
                    lectura.setHumedadSuelo(null);
                    lecturaRepository.save(lectura);
                    
                    try {
                        messagingTemplate.convertAndSend("/topic/lecturas", lectura);
                    } catch (Exception e) {
                        System.err.println("Error enviando WebSocket de lectura OWM: " + e.getMessage());
                    }
                    
                    try {
                        alarmaService.evaluarSensor(lectura.getEstacionId(), "temperatura", lectura.getTemperatura());
                        alarmaService.evaluarSensor(lectura.getEstacionId(), "humedad_aire", lectura.getHumedadAire());
                        alarmaService.evaluarSensor(lectura.getEstacionId(), "presion", lectura.getPresion());
                        alarmaService.evaluarSensor(lectura.getEstacionId(), "velocidad_viento", lectura.getVelocidadViento());
                        alarmaService.evaluarSensor(lectura.getEstacionId(), "lluvia", lectura.getLluvia());
                    } catch (Exception e) {
                        System.err.println("Error al evaluar alarmas de lectura OWM: " + e.getMessage());
                    }
                    exitosos++;
                } else {
                    fallidos++;
                    mensajeError.append("Error de API para estación ").append(est.getNombre()).append(". ");
                }
            } catch (Exception e) {
                fallidos++;
                mensajeError.append("Excepción en ").append(est.getNombre()).append(": ").append(e.getMessage()).append(". ");
            }
        }
        IntegracionSyncLog log = new IntegracionSyncLog();
        log.setFechaHora(LocalDateTime.now());
        log.setPlataforma("openweathermap");
        if (config.getEstacionesIds() != null && !config.getEstacionesIds().trim().isEmpty() && !estaciones.isEmpty()) {
            if (estaciones.size() == 1) {
                log.setEstacionNombre(estaciones.get(0).getNombre());
            } else {
                log.setEstacionNombre(estaciones.size() + " estaciones");
            }
        } else {
            log.setEstacionNombre("Todas las estaciones");
        }
        log.setRegistrosEnviados(exitosos);
        if (exitosos > 0 && fallidos == 0) {
            log.setEstado("EXITOSO");
            log.setMensaje("Sincronización completa");
        } else if (exitosos > 0 && fallidos > 0) {
            log.setEstado("ADVERTENCIA");
            log.setMensaje("Sincronizado parcialmente. " + mensajeError.toString());
        } else {
            log.setEstado("ERROR");
            log.setMensaje("Fallo total. " + mensajeError.toString());
        }
        syncLogRepository.save(log);
        LocalDateTime now = LocalDateTime.now();
        config.setUltimaSincronizacion(now);
        integracionRepository.save(config);
        try {
            java.util.Map<String, Object> wsPayload = new java.util.HashMap<>();
            wsPayload.put("fechaHora", log.getFechaHora().toString());
            wsPayload.put("plataforma", log.getPlataforma());
            wsPayload.put("estacionNombre", log.getEstacionNombre());
            wsPayload.put("registrosEnviados", log.getRegistrosEnviados());
            wsPayload.put("estado", log.getEstado());
            wsPayload.put("mensaje", log.getMensaje());
            wsPayload.put("syncsHoy", syncLogRepository.countByFechaHoraAfter(now.toLocalDate().atStartOfDay()));
            wsPayload.put("plataformasConectadas", integracionRepository.findByActivaTrue().size());
            wsPayload.put("ultimaSincronizacion", now.toString());
            messagingTemplate.convertAndSend("/topic/integracion", (Object) wsPayload);
        } catch (Exception e) {
            System.err.println("Error al enviar WebSocket de integración: " + e.getMessage());
        }
    }
    private String convertirGradosADireccion(double grados) {
        String[] direcciones = {"N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"};
        return direcciones[(int) Math.round(((grados % 360) / 45))];
    }
    
    public List<Map<String, Object>> obtenerPronosticoGeneral() {
        if (cachedForecast != null && lastForecastTime != null && 
            java.time.Duration.between(lastForecastTime, LocalDateTime.now()).toHours() < 2) {
            return cachedForecast;
        }
        
        try {
            
            String url = "https://api.open-meteo.com/v1/forecast?latitude=19.45&longitude=-70.697&daily=temperature_2m_max,precipitation_probability_max,weather_code&timezone=America%2FNew_York";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                Map<String, Object> daily = (Map<String, Object>) body.get("daily");
                
                List<String> time = (List<String>) daily.get("time");
                List<Number> tempMax = (List<Number>) daily.get("temperature_2m_max");
                List<Number> precipProb = (List<Number>) daily.get("precipitation_probability_max");
                List<Number> weatherCode = (List<Number>) daily.get("weather_code");
                
                List<Map<String, Object>> pronostico7Dias = new java.util.ArrayList<>();
                
                for (int i = 0; i < time.size() && i < 7; i++) {
                    Map<String, Object> dayForecast = new java.util.HashMap<>();
                    
                    dayForecast.put("temp", tempMax.get(i).doubleValue());
                    
                    int code = weatherCode.get(i).intValue();
                    String condition = "Clear";
                    if (code == 1 || code == 2 || code == 3) condition = "Clouds";
                    else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) condition = "Rain";
                    else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) condition = "Snow";
                    else if (code >= 95 && code <= 99) condition = "Thunderstorm";
                    
                    dayForecast.put("condition", condition);
                    
                    dayForecast.put("pop", precipProb.get(i).doubleValue() / 100.0);
                    
                    String dateStr = time.get(i);
                    java.time.LocalDate date = java.time.LocalDate.parse(dateStr);
                    dayForecast.put("dt", date.atStartOfDay(java.time.ZoneOffset.UTC).toEpochSecond());
                    
                    pronostico7Dias.add(dayForecast);
                }
                
                this.cachedForecast = pronostico7Dias;
                this.lastForecastTime = LocalDateTime.now();
                return pronostico7Dias;
            }
        } catch (Exception e) {
            System.err.println("Error obteniendo pronostico de Open-Meteo: " + e.getMessage());
        }
        
        return new java.util.ArrayList<>();
    }
}
