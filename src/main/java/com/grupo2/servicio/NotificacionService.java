package com.grupo2.servicio;

import com.grupo2.entidad.Alarma;
import com.grupo2.entidad.Estacion;
import com.grupo2.entidad.Usuario;
import com.grupo2.repositorio.UsuarioRepository;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificacionService {

    private final UsuarioRepository usuarioRepository;
    private final EmailService emailService;
    private final ReporteService reporteService;

    public NotificacionService(UsuarioRepository usuarioRepository, EmailService emailService, ReporteService reporteService) {
        this.usuarioRepository = usuarioRepository;
        this.emailService = emailService;
        this.reporteService = reporteService;
    }

    @Async
    public void notificarAlarma(Alarma alarma) {
        if ("conexion".equalsIgnoreCase(alarma.getSensor())) {
            // Se maneja independientemente por notificarDesconexion en EstacionService
            return;
        }
        
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (Boolean.TRUE.equals(u.getNotificarAlarmas()) && u.getEmail() != null) {
                String asunto = "ALERTA " + alarma.getGravedad() + " - Estación " + alarma.getEstacionNombre();
                String mensaje = "Se ha detectado una anomalía en la estación " + alarma.getEstacionNombre() + ".\n\n" +
                        "Sensor: " + alarma.getSensor() + "\n" +
                        "Valor detectado: " + alarma.getValor() + "\n" +
                        "Umbral superado: " + alarma.getUmbralExcedido() + "\n\n" +
                        "Por favor, revise el sistema.";
                emailService.enviarCorreoSimple(u.getEmail(), asunto, mensaje);
            }
        }
    }

    @Async
    public void notificarDesconexion(Estacion estacion) {
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (Boolean.TRUE.equals(u.getNotificarDesconexion()) && u.getEmail() != null) {
                String asunto = "DESCONEXIÓN - Estación " + estacion.getNombre();
                String mensaje = "La estación " + estacion.getNombre() + " (Código: " + estacion.getCodigo() + ") ha perdido conexión con el servidor.\n\n" +
                        "Última vez vista: " + LocalDateTime.now().toString() + "\n\n" +
                        "Por favor, verifique el estado del equipo.";
                emailService.enviarCorreoSimple(u.getEmail(), asunto, mensaje);
            }
        }
    }

    @Async
    public void notificarSyncFallida(String errorMensaje) {
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (Boolean.TRUE.equals(u.getNotificarSyncFallida()) && u.getEmail() != null) {
                String asunto = "FALLO DE SINCRONIZACIÓN - Plataformas Externas";
                String mensaje = "Ha ocurrido un error al intentar sincronizar los datos con plataformas externas (ej. OpenWeatherMap).\n\n" +
                        "Detalle del error:\n" + errorMensaje + "\n\n" +
                        "Verifique la conexión a internet o la validez de las API Keys.";
                emailService.enviarCorreoSimple(u.getEmail(), asunto, mensaje);
            }
        }
    }

    // Reporte diario a las 8:00 AM todos los días
    @Scheduled(cron = "0 0 8 * * ?")
    public void enviarReporteDiario() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            if (Boolean.TRUE.equals(u.getReportesDiarios()) && u.getEmail() != null) {
                String asunto = "Reporte Diario - Estación Meteorológica";
                String mensaje = "Hola " + u.getNombre() + ",\n\n" +
                        "Este es el resumen diario de su red de estaciones meteorológicas.\n" +
                        "Actualmente el sistema está operando y recolectando datos.\n\n" +
                        "Ingrese a la plataforma para ver los gráficos detallados y el estado actual de los sensores.\n\n" +
                        "Atentamente,\nEquipo Estación Meteorológica";
                emailService.enviarCorreoSimple(u.getEmail(), asunto, mensaje);
            }
        }
    }

    // Reporte semanal los Lunes a las 8:00 AM
    @Scheduled(cron = "0 0 8 ? * MON")
    public void enviarReporteSemanal() {
        List<Usuario> usuarios = usuarioRepository.findAll();
        boolean generarPdf = usuarios.stream().anyMatch(u -> Boolean.TRUE.equals(u.getReportesSemanales()) && u.getEmail() != null);
        
        if (!generarPdf) return;
        
        try {
            LocalDateTime fin = LocalDateTime.now();
            LocalDateTime inicio = fin.minusDays(7);
            
            // 0 = Todas las estaciones
            java.util.Map<String, Object> datos = reporteService.getDatosReporte(0, inicio, fin);
            String rango = inicio.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")) + " - " + 
                           fin.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            
            // Incluir las tablas y graficos lógicos para que Thymeleaf pueda renderizar si lo requiere (aunque los de imagen base64 no los podemos inyectar aquí tan fácil, dejaremos los de texto y tablas).
            datos.put("incluirMeteorologia", false); // Sin gráficos visuales generados por frontend
            datos.put("incluirGestion", false);
            datos.put("incluirTablaLecturas", true);
            datos.put("variableFiltro", "all");
            
            byte[] pdfBytes = reporteService.generarPdfReporte(datos, "Todas las Estaciones", rango);
            String filename = "Reporte_Semanal_" + java.time.LocalDate.now().toString() + ".pdf";
            
            for (Usuario u : usuarios) {
                if (Boolean.TRUE.equals(u.getReportesSemanales()) && u.getEmail() != null) {
                    String asunto = "Reporte Ejecutivo Semanal - Estación Meteorológica";
                    String mensaje = "Hola " + u.getNombre() + ",\n\n" +
                            "Adjunto encontrarás el reporte ejecutivo semanal de nuestra red de estaciones correspondiente a la semana del " + rango + ".\n\n" +
                            "Atentamente,\nEquipo Estación Meteorológica";
                    
                    emailService.enviarCorreoConAdjuntoPdf(u.getEmail(), asunto, mensaje, filename, pdfBytes);
                }
            }
        } catch (Exception e) {
            System.err.println("Error al generar y enviar el reporte semanal: " + e.getMessage());
        }
    }
}
