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
    @GetMapping("/login")
    public String login(jakarta.servlet.http.HttpServletRequest request, Model model, @org.springframework.web.bind.annotation.RequestParam(value = "error", required = false) String error) {
        jakarta.servlet.http.HttpSession session = request.getSession(false);
        if (session != null) {
            String lastUsername = (String) session.getAttribute("LAST_USERNAME");
            if (lastUsername != null) {
                model.addAttribute("lastUsername", lastUsername);
                session.removeAttribute("LAST_USERNAME");
            }
        }
        
        if (error != null) {
            String specificError = error.isEmpty() ? "true" : error;
            if (session != null) {
                Exception ex = (Exception) session.getAttribute(org.springframework.security.web.WebAttributes.AUTHENTICATION_EXCEPTION);
                if (ex != null) {
                    Throwable rootCause = ex;
                    if (ex instanceof org.springframework.security.authentication.InternalAuthenticationServiceException && ex.getCause() != null) {
                        rootCause = ex.getCause();
                    }
                    if (rootCause instanceof org.springframework.security.core.userdetails.UsernameNotFoundException) {
                        specificError = "not_found";
                    } else if (rootCause instanceof org.springframework.security.authentication.BadCredentialsException || ex instanceof org.springframework.security.authentication.BadCredentialsException) {
                        specificError = "bad_credentials";
                    }
                }
            }
            model.addAttribute("loginError", specificError);
        }
        
        return "login";
    }

    @GetMapping("/")
    public String root() {
        return "redirect:/inicio";
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
