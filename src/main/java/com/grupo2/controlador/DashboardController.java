package com.grupo2.controlador;
import com.grupo2.servicio.EstacionService;
import com.grupo2.servicio.LecturaService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.beans.factory.annotation.Value;
@Controller
public class DashboardController {
    private final LecturaService lecturaService;
    private final EstacionService estacionService;
    @Value("${api.mapbox.key}")
    private String mapboxApiKey;
    public DashboardController(LecturaService lecturaService, EstacionService estacionService) {
        this.lecturaService = lecturaService;
        this.estacionService = estacionService;
    }
    @GetMapping("/")
    public String login() {
        return "login";
    }
    @GetMapping("/inicio")
    public String index(Model model) {
        model.addAttribute("lecturas", lecturaService.getPrimeraPagina());
        model.addAttribute("total", lecturaService.getTotalRegistros());
        model.addAttribute("tamanioPagina", LecturaService.TAMANIO_PAGINA);
        model.addAttribute("estaciones", estacionService.obtenerTodasConUltimaLectura());
        model.addAttribute("mapboxApiKey", mapboxApiKey);
        return "index";
    }
    @GetMapping("/graficos")
    public String graficos(Model model) {
        model.addAttribute("estaciones", estacionService.obtenerTodasConUltimaLectura());
        return "graficos";
    }
}
