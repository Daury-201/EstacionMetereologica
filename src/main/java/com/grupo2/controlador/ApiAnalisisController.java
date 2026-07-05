package com.grupo2.controlador;

import com.grupo2.repositorio.LecturaSensoresRepository;
import com.grupo2.servicio.IntegracionService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/analisis")
public class ApiAnalisisController {

    private final LecturaSensoresRepository lecturaSensoresRepository;
    private final IntegracionService integracionService;

    public ApiAnalisisController(LecturaSensoresRepository lecturaSensoresRepository, IntegracionService integracionService) {
        this.lecturaSensoresRepository = lecturaSensoresRepository;
        this.integracionService = integracionService;
    }

    @GetMapping("/extremos-termicos")
    public List<Map<String, Object>> getExtremosTermicos() {
        LocalDateTime startDate = LocalDateTime.now().minusDays(7);
        List<Object[]> results = lecturaSensoresRepository.findExtremosTermicos(startDate);
        
        List<Map<String, Object>> response = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> map = new HashMap<>();
            map.put("estacion", row[0]);
            map.put("maxTemp", row[1]);
            map.put("minTemp", row[2]);
            response.add(map);
        }
        return response;
    }

    @GetMapping("/estacion/{id}/wind-rose")
    public Map<String, Integer> getWindRose(@PathVariable Integer id) {
        LocalDateTime startDate = LocalDateTime.now().minusDays(30);
        List<Object[]> results = lecturaSensoresRepository.findVientoDataByEstacion(id, startDate);
        
        Map<String, Integer> freqMap = new HashMap<>();
        for (Object[] row : results) {
            String dir = (String) row[0];
            if (dir != null && !dir.trim().isEmpty()) {
                freqMap.put(dir, freqMap.getOrDefault(dir, 0) + 1);
            }
        }
        return freqMap;
    }

    @GetMapping(value = "/estacion/{id}/prediccion-owm", produces = "application/json")
    public String getPrediccionOWM(@PathVariable Long id) {
        return integracionService.obtenerPronosticoOWM(id);
    }
}
