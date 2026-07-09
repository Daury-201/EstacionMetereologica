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

    public NotificacionService(UsuarioRepository usuarioRepository, EmailService emailService) {
        this.usuarioRepository = usuarioRepository;
        this.emailService = emailService;
    }

    @Async
    public void notificarAlarma(Alarma alarma) {
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
}
