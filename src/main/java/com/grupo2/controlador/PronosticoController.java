package com.grupo2.controlador;

import com.grupo2.servicio.IntegracionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pronostico")
public class PronosticoController {

    private final IntegracionService integracionService;

    @Autowired
    public PronosticoController(IntegracionService integracionService) {
        this.integracionService = integracionService;
    }

    @GetMapping
    public List<Map<String, Object>> obtenerPronostico(@org.springframework.web.bind.annotation.RequestParam(required = false) Long estacionId) {
        return integracionService.obtenerPronosticoGeneral(estacionId);
    }
}
