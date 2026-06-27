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

    // Vista principal
    @GetMapping("/")
    public String index(Model model) {
        List<LecturaSensor> lecturas = service.getPrimeraPagina();
        model.addAttribute("lecturas", lecturas);
        model.addAttribute("total", service.getTotalRegistros());
        model.addAttribute("tamanioPagina", LecturaService.TAMANIO_PAGINA);
        return "index";
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

    // Método para enviar nueva lectura por WebSocket (llamado desde LectorEstacion)
    public void enviarNuevaLectura(LecturaSensor lectura) {
        messagingTemplate.convertAndSend("/topic/lecturas", lectura);
    }

}