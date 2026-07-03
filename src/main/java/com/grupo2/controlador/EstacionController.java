package com.grupo2.controlador;
import com.grupo2.entidad.Estacion;
import com.grupo2.servicio.EstacionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
@Controller
@RequestMapping("/estaciones")
public class EstacionController {
    @Autowired
    private EstacionService estacionService;
    @org.springframework.beans.factory.annotation.Value("${api.mapbox.key}")
    private String mapboxApiKey;
    @GetMapping
    public String listarEstaciones(Model model) {
        java.util.List<com.grupo2.servicio.EstacionDTO> todas = estacionService.obtenerTodasConUltimaLectura();
        long enLinea = todas.stream().filter(e -> "En línea".equals(e.getEstado())).count();
        long sinSenal = todas.stream().filter(e -> "Sin señal".equals(e.getEstado())).count();
        long conAlarmas = todas.stream().filter(e -> e.getAlarmasActivas() != null && !e.getAlarmasActivas().isEmpty()).count();
        model.addAttribute("estaciones", todas);
        model.addAttribute("totalEnLinea", enLinea);
        model.addAttribute("totalSinSenal", sinSenal);
        model.addAttribute("totalConAlarmas", conAlarmas);
        model.addAttribute("nuevaEstacion", new Estacion()); 
        model.addAttribute("mapboxApiKey", mapboxApiKey);
        return "estaciones";
    }
    @PostMapping("/guardar")
    public String guardarEstacion(@ModelAttribute Estacion estacion, org.springframework.web.servlet.mvc.support.RedirectAttributes redirectAttrs) {
        if(estacion.getEstado() == null || estacion.getEstado().isEmpty()) {
            estacion.setEstado("En línea"); 
        }
        Estacion existente = estacionService.obtenerPorCodigo(estacion.getCodigo());
        if (existente != null && !existente.getId().equals(estacion.getId())) {
            redirectAttrs.addFlashAttribute("error", "El código de la estación ya existe.");
            redirectAttrs.addFlashAttribute("estacionConError", estacion);
            redirectAttrs.addFlashAttribute("modalToOpen", estacion.getId() != null ? "estacionEditModal" : "estacionModal");
            return "redirect:/estaciones";
        }
        boolean esEdicion = (estacion.getId() != null);
        estacionService.guardar(estacion);
        if (esEdicion) {
            redirectAttrs.addFlashAttribute("exitoEdit", "Estación modificada correctamente.");
            redirectAttrs.addFlashAttribute("estacionConError", estacion);
            redirectAttrs.addFlashAttribute("modalToOpen", "estacionEditModal");
        } else {
            redirectAttrs.addFlashAttribute("exito", "Estación guardada correctamente.");
        }
        return "redirect:/estaciones";
    }
    @PostMapping("/eliminar/{id}")
    public String eliminarEstacion(@PathVariable Long id) {
        estacionService.eliminar(id);
        return "redirect:/estaciones";
    }
}
