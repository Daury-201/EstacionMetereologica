package com.grupo2.controlador;
import com.grupo2.servicio.EstacionService;
import com.grupo2.servicio.ReporteService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.stream.Collectors;
import com.grupo2.modelo.LecturaSensor;
import java.util.List;
@Controller
public class ReporteController {
    private final EstacionService estacionService;
    private final ReporteService reporteService;
    public ReporteController(EstacionService estacionService, ReporteService reporteService) {
        this.estacionService = estacionService;
        this.reporteService = reporteService;
    }
    @GetMapping("/reportes")
    public String reportes(Model model) {
        model.addAttribute("estaciones", estacionService.obtenerTodasConUltimaLectura());
        return "reportes";
    }
    @GetMapping("/api/reportes/datos")
    @ResponseBody
    public Map<String, Object> obtenerDatosReporte(
            @RequestParam(defaultValue = "0") int estacionId,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin) {
        LocalDateTime fechaInicio = inicio != null && !inicio.isEmpty() ? LocalDateTime.parse(inicio + "T00:00:00") : LocalDateTime.now().minusDays(7);
        LocalDateTime fechaFin = fin != null && !fin.isEmpty() ? LocalDateTime.parse(fin + "T23:59:59") : LocalDateTime.now();
        return reporteService.getDatosReporte(estacionId, fechaInicio, fechaFin);
    }
    @PostMapping("/reportes/pdf")
    public ResponseEntity<byte[]> descargarPdfPost(
            @RequestParam(defaultValue = "0") int estacionId,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin,
            @RequestParam(required = false) String variable,
            @RequestParam(required = false) String chartImage,
            @RequestParam(required = false) String chartImageHum,
            @RequestParam(required = false) String chartImagePres,
            @RequestParam(required = false) String chartImageLluvia,
            @RequestParam(defaultValue = "true") boolean incluirMeteorologia,
            @RequestParam(defaultValue = "true") boolean incluirGestion,
            @RequestParam(defaultValue = "true") boolean incluirTablaLecturas,
            @RequestParam(required = false) String chartDonut,
            @RequestParam(required = false) String chartBarDia,
            @RequestParam(required = false) String chartBarSensor,
            @RequestParam(required = false) String chartUptime,
            @RequestParam(required = false) String nombreReporte) {
        try {
            LocalDateTime fechaInicio = inicio != null && !inicio.isEmpty() ? LocalDateTime.parse(inicio + "T00:00:00") : LocalDateTime.now().minusDays(7);
            LocalDateTime fechaFin = fin != null && !fin.isEmpty() ? LocalDateTime.parse(fin + "T23:59:59") : LocalDateTime.now();
            Map<String, Object> datos = reporteService.getDatosReporte(estacionId, fechaInicio, fechaFin);
            datos.put("variableFiltro", variable);
            datos.put("chartImage", chartImage);
            datos.put("chartImageHum", chartImageHum);
            datos.put("chartImagePres", chartImagePres);
            datos.put("chartImageLluvia", chartImageLluvia);
            datos.put("incluirMeteorologia", incluirMeteorologia);
            datos.put("incluirTablaLecturas", incluirTablaLecturas);
            datos.put("incluirGestion", incluirGestion);
            datos.put("chartDonut", chartDonut);
            datos.put("chartBarDia", chartBarDia);
            datos.put("chartBarSensor", chartBarSensor);
            datos.put("chartUptime", chartUptime);
            String estacionNombre = estacionId == 0 ? "Todas las estaciones" : estacionService.obtenerTodasConUltimaLectura().stream().filter(e -> e.getId() == estacionId).findFirst().map(e -> e.getNombre()).orElse("Desconocida");
            String rangoFechas = fechaInicio.format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " - " + fechaFin.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            byte[] pdfBytes = reporteService.generarPdfReporte(datos, estacionNombre, rangoFechas);
            String fileName = (nombreReporte != null && !nombreReporte.trim().isEmpty()) ? nombreReporte.trim() : "Reporte_EstacionMeteorologica";
            if (!fileName.toLowerCase().endsWith(".pdf")) {
                fileName += ".pdf";
            }
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_PDF);
            headers.setContentDispositionFormData("attachment", fileName);
            headers.setCacheControl("must-revalidate, post-check=0, pre-check=0");
            return new ResponseEntity<>(pdfBytes, headers, HttpStatus.OK);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    @GetMapping("/reportes/csv")
    public ResponseEntity<String> descargarCsv(
            @RequestParam(defaultValue = "0") int estacionId,
            @RequestParam(required = false) String inicio,
            @RequestParam(required = false) String fin) {
        LocalDateTime fechaInicio = inicio != null && !inicio.isEmpty() ? LocalDateTime.parse(inicio + "T00:00:00") : LocalDateTime.now().minusDays(7);
        LocalDateTime fechaFin = fin != null && !fin.isEmpty() ? LocalDateTime.parse(fin + "T23:59:59") : LocalDateTime.now();
        Map<String, Object> datos = reporteService.getDatosReporte(estacionId, fechaInicio, fechaFin);
        List<LecturaSensor> lecturas = (List<LecturaSensor>) datos.get("lecturas");
        StringBuilder csv = new StringBuilder();
        csv.append("FECHA / HORA,TEMP. (°C),HUMEDAD (%),PRESIÓN (HPA),VIENTO (KM/H),DIRECCIÓN,LLUVIA (MM),H. SUELO (%)\n");
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
        for (LecturaSensor l : lecturas) {
            csv.append(l.getFechaHora() != null ? l.getFechaHora().format(formatter) : "").append(",");
            csv.append(l.getTemperatura() != null ? l.getTemperatura() : "").append(",");
            csv.append(l.getHumedadAire() != null ? l.getHumedadAire() : "").append(",");
            csv.append(l.getPresion() != null ? l.getPresion() : "").append(",");
            csv.append(l.getVelocidadViento() != null ? l.getVelocidadViento() : "").append(",");
            csv.append(l.getDireccionViento() != null ? l.getDireccionViento() : "").append(",");
            csv.append(l.getLluvia() != null ? l.getLluvia() : "").append(",");
            csv.append(l.getHumedadSuelo() != null ? l.getHumedadSuelo() : "").append("\n");
        }
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDispositionFormData("attachment", "Lecturas_EstacionMeteorologica.csv");
        String csvContent = "\ufeff" + csv.toString();
        return new ResponseEntity<>(csvContent, headers, HttpStatus.OK);
    }
}
