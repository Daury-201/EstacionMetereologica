package com.grupo2.controlador;
import com.grupo2.modelo.LecturaSensor;
import com.grupo2.servicio.LecturaService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import java.util.List;
@Controller
public class LecturaController {
    private final LecturaService service;
    private final SimpMessagingTemplate messagingTemplate;
    public LecturaController(LecturaService service,
                             SimpMessagingTemplate messagingTemplate) {
        this.service = service;
        this.messagingTemplate = messagingTemplate;
    }
    @GetMapping("/api/lecturas")
    @ResponseBody
    public List<LecturaSensor> getLecturas(
            @RequestParam(defaultValue = "0") long ultimoId) {
        if (ultimoId == 0) {
            return service.getPrimeraPagina();
        }
        return service.getPaginaSiguiente(ultimoId);
    }
    @GetMapping("/api/lecturas/total")
    @ResponseBody
    public long getTotal() {
        return service.getTotalRegistros();
    }
    public void enviarNuevaLectura(LecturaSensor lectura) {
        messagingTemplate.convertAndSend("/topic/lecturas", lectura);
    }
    @GetMapping("/api/lecturas/historial/{estacionId}")
    @ResponseBody
    public List<LecturaSensor> getHistorial(
            @org.springframework.web.bind.annotation.PathVariable int estacionId,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime fechaInicio,
            @RequestParam(required = false) @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME) java.time.LocalDateTime fechaFin,
            @RequestParam(defaultValue = "100") int limite) {
        if (fechaInicio != null && fechaFin != null) {
            return service.getHistorialPorRango(estacionId, fechaInicio, fechaFin, limite);
        }
        return service.getHistorialPorEstacion(estacionId, limite);
    }
}