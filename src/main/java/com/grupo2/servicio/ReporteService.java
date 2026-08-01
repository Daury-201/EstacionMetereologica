package com.grupo2.servicio;
import com.grupo2.modelo.LecturaSensor;
import com.grupo2.repositorio.LecturaRepository;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;
import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
@Service
public class ReporteService {
    private final LecturaRepository lecturaRepository;
    private final com.grupo2.repositorio.AlarmaRepository alarmaRepository;
    private final TemplateEngine templateEngine;
    private final FormatoService formatoService;
    private final com.grupo2.repositorio.EstacionRepository estacionRepository;
    
    public ReporteService(LecturaRepository lecturaRepository, com.grupo2.repositorio.AlarmaRepository alarmaRepository, TemplateEngine templateEngine, FormatoService formatoService, com.grupo2.repositorio.EstacionRepository estacionRepository) {
        this.lecturaRepository = lecturaRepository;
        this.alarmaRepository = alarmaRepository;
        this.templateEngine = templateEngine;
        this.formatoService = formatoService;
        this.estacionRepository = estacionRepository;
    }
    public Map<String, Object> getDatosReporte(int estacionId, LocalDateTime inicio, LocalDateTime fin) {
        List<LecturaSensor> lecturas = lecturaRepository.findLecturasParaReporte(estacionId, inicio, fin);
        double sumaTemp = 0, sumaHum = 0, sumaPres = 0, lluviaTotal = 0;
        int countTemp = 0, countHum = 0, countPres = 0;
        for (LecturaSensor l : lecturas) {
            if (l.getTemperatura() != null) {
                sumaTemp += l.getTemperatura();
                countTemp++;
            }
            if (l.getHumedadAire() != null) {
                sumaHum += l.getHumedadAire();
                countHum++;
            }
            if (l.getPresion() != null) {
                sumaPres += l.getPresion();
                countPres++;
            }
            if (l.getLluvia() != null) {
                lluviaTotal += l.getLluvia();
            }
        }
        Map<String, Object> datos = new HashMap<>();
        datos.put("lecturas", lecturas);
        List<LecturaSensor> lecturasTabla = lecturas.size() > 100 ? lecturas.subList(0, 100) : lecturas;
        datos.put("lecturasTabla", lecturasTabla);
        datos.put("tempPromedio", countTemp > 0 ? sumaTemp / countTemp : 0.0);
        datos.put("humedadPromedio", countHum > 0 ? sumaHum / countHum : 0.0);
        datos.put("presionPromedio", countPres > 0 ? sumaPres / countPres : 0.0);
        datos.put("lluviaAcumulada", lluviaTotal);
        List<com.grupo2.entidad.Alarma> alarmas;
        if (estacionId == 0) {
            alarmas = alarmaRepository.findByFechaHoraBetween(inicio, fin);
        } else {
            alarmas = alarmaRepository.findByEstacionIdAndFechaHoraBetween(estacionId, inicio, fin);
        }
        Map<String, Long> alarmasPorGravedad = alarmas.stream()
            .collect(java.util.stream.Collectors.groupingBy(com.grupo2.entidad.Alarma::getGravedad, java.util.stream.Collectors.counting()));
        Map<String, Long> alarmasPorSensor = alarmas.stream()
            .collect(java.util.stream.Collectors.groupingBy(com.grupo2.entidad.Alarma::getSensor, java.util.stream.Collectors.counting()));
        Map<String, Long> alarmasPorDia = alarmas.stream()
            .collect(java.util.stream.Collectors.groupingBy(
                a -> a.getFechaHora().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd")), 
                java.util.stream.Collectors.counting()));
        datos.put("alarmasTotal", alarmas.size());
        datos.put("alarmasPorGravedad", alarmasPorGravedad);
        datos.put("alarmasPorSensor", alarmasPorSensor);
        datos.put("alarmasPorDia", alarmasPorDia);
        String tiempoInactivo = "N/A";
        if (estacionId != 0) {
            if (!lecturas.isEmpty()) {
                LocalDateTime ultima = lecturas.get(0).getFechaHora(); 
                long minutos = java.time.Duration.between(ultima, LocalDateTime.now()).toMinutes();
                if (minutos < 60) {
                    tiempoInactivo = "Conectado";
                } else if (minutos < 1440) {
                    tiempoInactivo = "Hace " + (minutos / 60) + " horas";
                } else {
                    tiempoInactivo = "Hace " + (minutos / 1440) + " días";
                }
            } else {
                tiempoInactivo = "Sin datos en el período";
            }
        } else {
            tiempoInactivo = "Estado general de la red";
        }
        datos.put("tiempoInactivo", tiempoInactivo);
        
        Map<Integer, String> estacionNombres = new HashMap<>();
        List<com.grupo2.entidad.Estacion> todasEstaciones = estacionRepository.findAll();
        for (com.grupo2.entidad.Estacion e : todasEstaciones) {
            estacionNombres.put(e.getId().intValue(), e.getNombre());
        }
        datos.put("estacionNombres", estacionNombres);
        
        return datos;
    }
    public byte[] generarPdfReporte(Map<String, Object> datos, String estacionNombre, String rangoFechas) throws Exception {
        Context context = new Context();
        context.setVariables(datos);
        context.setVariable("estacionNombre", estacionNombre);
        context.setVariable("rangoFechas", rangoFechas);
        context.setVariable("formatter", formatoService);
        String htmlContent = templateEngine.process("reporte-pdf", context);
        Document doc = Jsoup.parse(htmlContent, "UTF-8");
        doc.outputSettings().syntax(Document.OutputSettings.Syntax.xml);
        String xhtml = doc.html();
        try (ByteArrayOutputStream os = new ByteArrayOutputStream()) {
            PdfRendererBuilder builder = new PdfRendererBuilder();
            builder.withHtmlContent(xhtml, "/");
            builder.toStream(os);
            builder.run();
            return os.toByteArray();
        }
    }
}
