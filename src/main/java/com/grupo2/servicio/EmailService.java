package com.grupo2.servicio;

import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;

@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final SpringTemplateEngine templateEngine;
    
    @org.springframework.beans.factory.annotation.Value("${spring.mail.username}")
    private String senderEmail;

    public EmailService(JavaMailSender mailSender, SpringTemplateEngine templateEngine) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
    }

    public void enviarCorreoRecuperacion(String email, String nuevaClave) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(senderEmail);
            helper.setTo(email);
            helper.setSubject("Recuperación de Contraseña - Estación Meteorológica");

            Context context = new Context();
            context.setVariable("nuevaClave", nuevaClave);
            
            String html = templateEngine.process("emails/recuperacion-password", context);
            helper.setText(html, true);

            mailSender.send(message);
            System.out.println("Correo de recuperación enviado a: " + email);
        } catch (Exception e) {
            System.err.println("Error al enviar el correo a " + email + ": " + e.getMessage());
            System.out.println("NUEVA CLAVE PARA " + email + " ES: " + nuevaClave);
        }
    }

    public void enviarCorreoVerificacion(String email, String nombre, String codigo) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(senderEmail);
            helper.setTo(email);
            helper.setSubject("Código de Verificación - Estación Meteorológica");

            Context context = new Context();
            context.setVariable("nombre", nombre);
            context.setVariable("codigo", codigo);

            String html = templateEngine.process("emails/verificacion-registro", context);
            helper.setText(html, true);

            mailSender.send(message);
            System.out.println("Correo de verificación enviado a: " + email);
        } catch (Exception e) {
            System.err.println("Error al enviar el correo de verificación a " + email + ": " + e.getMessage());
            System.out.println("CÓDIGO DE VERIFICACIÓN PARA " + email + " ES: " + codigo);
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
