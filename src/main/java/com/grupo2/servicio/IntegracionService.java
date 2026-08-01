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
    @Autowired
    private NotificacionService notificacionService;
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

    @Scheduled(cron = "0 0 0 * * ?") // Runs every day at midnight
    @Transactional
    public void limpiarLogsAntiguos() {
        LocalDateTime sieteDiasAtras = LocalDateTime.now().minusDays(7);
        syncLogRepository.deleteByFechaHoraBefore(sieteDiasAtras);
        System.out.println("Limpieza automática: Logs de sincronización de integraciones anteriores a " + sieteDiasAtras + " han sido eliminados.");
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
                    lectura.setOrigen("OWM");
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
                    
                    // DESACTIVADO PARA QUE NO SOBREESCRIBA AL ARDUINO
                    // lecturaRepository.save(lectura);
                    // try {
                    //     messagingTemplate.convertAndSend("/topic/lecturas", lectura);
                    // } catch (Exception e) {
                    //     System.err.println("Error enviando WebSocket de lectura OWM: " + e.getMessage());
                    // }
                    // try {
                    //     alarmaService.evaluarSensor(lectura.getEstacionId(), "temperatura", lectura.getTemperatura());
                    //     alarmaService.evaluarSensor(lectura.getEstacionId(), "humedad_aire", lectura.getHumedadAire());
                    //     alarmaService.evaluarSensor(lectura.getEstacionId(), "presion", lectura.getPresion());
                    //     alarmaService.evaluarSensor(lectura.getEstacionId(), "velocidad_viento", lectura.getVelocidadViento());
                    //     alarmaService.evaluarSensor(lectura.getEstacionId(), "lluvia", lectura.getLluvia());
                    // } catch (Exception e) {
                    //     System.err.println("Error al evaluar alarmas de lectura OWM: " + e.getMessage());
                    // }
                    
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
            notificacionService.notificarSyncFallida(log.getMensaje());
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
    
    // Cache per station id to avoid excessive API calls (key 0 for default coordinates)
    private java.util.Map<Long, List<Map<String, Object>>> forecastCache = new java.util.concurrent.ConcurrentHashMap<>();
    private java.util.Map<Long, LocalDateTime> forecastCacheTimes = new java.util.concurrent.ConcurrentHashMap<>();

    public List<Map<String, Object>> obtenerPronosticoGeneral(Long estacionId) {
        Long cacheKey = estacionId != null ? estacionId : 0L;
        LocalDateTime lastTime = forecastCacheTimes.get(cacheKey);
        if (lastTime != null && java.time.Duration.between(lastTime, LocalDateTime.now()).toHours() < 2) {
            return forecastCache.get(cacheKey);
        }
        
        try {
            double lat = 19.45;
            double lon = -70.697;
            
            if (estacionId != null) {
                java.util.Optional<com.grupo2.entidad.Estacion> estOpt = estacionRepository.findById(estacionId);
                if (estOpt.isPresent()) {
                    lat = estOpt.get().getLatitud();
                    lon = estOpt.get().getLongitud();
                }
            }

            String url = String.format("https://api.openweathermap.org/data/2.5/forecast?lat=%s&lon=%s&appid=%s&units=metric",
                    lat, lon, openWeatherMapApiKey);
                    
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                List<Map<String, Object>> list = (List<Map<String, Object>>) body.get("list");
                
                java.util.Map<String, Map<String, Object>> dailyData = new java.util.LinkedHashMap<>();
                
                for (Map<String, Object> item : list) {
                    String dtTxt = (String) item.get("dt_txt"); 
                    String dayDate = dtTxt.substring(0, 10);
                    
                    Map<String, Object> main = (Map<String, Object>) item.get("main");
                    double temp = ((Number) main.get("temp_max")).doubleValue();
                    double pop = 0.0;
                    if (item.containsKey("pop")) {
                        pop = ((Number) item.get("pop")).doubleValue();
                    }
                    
                    List<Map<String, Object>> weather = (List<Map<String, Object>>) item.get("weather");
                    String mainWeather = (String) weather.get(0).get("main");
                    int weatherId = ((Number) weather.get(0).get("id")).intValue();
                    
                    if (weatherId == 800) {
                        mainWeather = "Clear";
                    } else if (weatherId == 801) {
                        mainWeather = "MostlySunny";
                    } else if (weatherId == 802) {
                        mainWeather = "PartlySunny";
                    } else if (weatherId == 803) {
                        mainWeather = "MostlyCloudy";
                    } else if (weatherId == 804) {
                        mainWeather = "Overcast";
                    } else if (weatherId >= 210 && weatherId <= 221) {
                        mainWeather = "ScatteredStorm";
                    } else if (weatherId >= 200 && weatherId <= 232) {
                        mainWeather = "Storm";
                    }
                    
                    if (!dailyData.containsKey(dayDate)) {
                        Map<String, Object> dayInfo = new java.util.HashMap<>();
                        dayInfo.put("temp", temp);
                        dayInfo.put("pop", pop);
                        dayInfo.put("condition", mainWeather);
                        dayInfo.put("dt", ((Number) item.get("dt")).longValue());
                        dailyData.put(dayDate, dayInfo);
                    } else {
                        Map<String, Object> dayInfo = dailyData.get(dayDate);
                        double currentMaxTemp = (double) dayInfo.get("temp");
                        if (temp > currentMaxTemp) {
                            dayInfo.put("temp", temp);
                        }
                        
                        double currentMaxPop = (double) dayInfo.get("pop");
                        if (pop > currentMaxPop) {
                            dayInfo.put("pop", pop);
                        }
                        
                        String currentCond = (String) dayInfo.get("condition");
                        if (mainWeather.equals("Storm") || mainWeather.equals("ScatteredStorm") || 
                           (mainWeather.equals("Rain") && !currentCond.contains("Storm")) ||
                           (mainWeather.equals("Snow") && !currentCond.contains("Storm") && !currentCond.equals("Rain"))) {
                            dayInfo.put("condition", mainWeather);
                        }
                    }
                }
                
                List<Map<String, Object>> pronosticoDias = new java.util.ArrayList<>(dailyData.values());
                
                // Keep only next 7 days (usually OWM returns 5 days max anyway)
                if (pronosticoDias.size() > 7) {
                    pronosticoDias = pronosticoDias.subList(0, 7);
                }
                
                // HYBRID FORECAST: If OWM provided less than 7 days, complement with Open-Meteo
                if (pronosticoDias.size() < 7) {
                    complementarConOpenMeteo(pronosticoDias, lat, lon);
                }
                
                forecastCache.put(cacheKey, pronosticoDias);
                forecastCacheTimes.put(cacheKey, LocalDateTime.now());
                return pronosticoDias;
            }
        } catch (Exception e) {
            System.err.println("Error obteniendo pronostico de OWM: " + e.getMessage());
        }
        
        return new java.util.ArrayList<>();
    }

    private void complementarConOpenMeteo(List<Map<String, Object>> pronosticoDias, double lat, double lon) {
        try {
            String url = String.format(java.util.Locale.US, "https://api.open-meteo.com/v1/forecast?latitude=%.4f&longitude=%.4f&daily=weathercode,temperature_2m_max,precipitation_probability_max&timezone=auto", lat, lon);
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> body = response.getBody();
                if (body.containsKey("daily")) {
                    Map<String, Object> daily = (Map<String, Object>) body.get("daily");
                    List<String> time = (List<String>) daily.get("time");
                    List<Number> tempMax = (List<Number>) daily.get("temperature_2m_max");
                    List<Number> popMax = (List<Number>) daily.get("precipitation_probability_max");
                    List<Number> weathercode = (List<Number>) daily.get("weathercode");

                    // Start from the day after the last OWM day
                    int daysNeeded = 7 - pronosticoDias.size();
                    int added = 0;
                    
                    // We skip the first few days of Open-Meteo since OWM already provided them.
                    // A simple heuristic is to take the last days of the 7-day Open-Meteo forecast.
                    for (int i = time.size() - daysNeeded; i < time.size() && i >= 0 && added < daysNeeded; i++) {
                        Map<String, Object> dayInfo = new java.util.HashMap<>();
                        dayInfo.put("temp", tempMax.get(i) != null ? tempMax.get(i).doubleValue() : 25.0);
                        dayInfo.put("pop", popMax.get(i) != null ? popMax.get(i).doubleValue() / 100.0 : 0.0);
                        dayInfo.put("condition", mapOpenMeteoCode(weathercode.get(i) != null ? weathercode.get(i).intValue() : 0));
                        dayInfo.put("dt", System.currentTimeMillis() / 1000 + (86400 * (pronosticoDias.size() + added)));
                        
                        pronosticoDias.add(dayInfo);
                        added++;
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error obteniendo pronostico complementario de Open-Meteo: " + e.getMessage());
        }
    }

    private String mapOpenMeteoCode(int code) {
        if (code == 0) return "Clear";
        if (code == 1) return "MostlySunny";
        if (code == 2) return "PartlySunny";
        if (code == 3) return "Overcast";
        if (code == 45 || code == 48) return "Overcast";
        if (code >= 51 && code <= 67) return "Rain";
        if (code >= 71 && code <= 77) return "Snow";
        if (code >= 80 && code <= 82) return "Rain";
        if (code == 85 || code == 86) return "Snow";
        if (code == 95) return "ScatteredStorm";
        if (code >= 96 && code <= 99) return "Storm";
        return "Clear";
    }
}
