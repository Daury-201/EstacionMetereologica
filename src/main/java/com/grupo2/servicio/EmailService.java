package com.grupo2.servicio;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    
    @org.springframework.beans.factory.annotation.Value("${spring.mail.username}")
    private String senderEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void enviarCorreoRecuperacion(String email, String nuevaClave) {
        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(senderEmail);
            mensaje.setTo(email);
            mensaje.setSubject("Recuperación de Contraseña - Estación Meteorológica");
            mensaje.setText("Hola,\n\nTu contraseña ha sido restablecida.\n" +
                    "Tu nueva contraseña temporal es: " + nuevaClave + "\n\n" +
                    "Por favor, inicia sesión y cámbiala lo antes posible.\n\n" +
                    "Atentamente,\nEquipo Estación Meteorológica");

            mailSender.send(mensaje);
            System.out.println("Correo de recuperación enviado a: " + email);
        } catch (Exception e) {
            System.err.println("Error al enviar el correo a " + email + ": " + e.getMessage());

            System.out.println("NUEVA CLAVE PARA " + email + " ES: " + nuevaClave);
        }
    }

    public void enviarCorreoSimple(String email, String asunto, String texto) {
        try {
            SimpleMailMessage mensaje = new SimpleMailMessage();
            mensaje.setFrom(senderEmail);
            mensaje.setTo(email);
            mensaje.setSubject(asunto);
            mensaje.setText(texto);
            mailSender.send(mensaje);
            System.out.println("Correo enviado a: " + email + " con asunto: " + asunto);
        } catch (Exception e) {
            System.err.println("Error al enviar correo a " + email + ": " + e.getMessage());
        }
    }
}
