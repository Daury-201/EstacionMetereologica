package com.grupo2.controlador;

import com.grupo2.entidad.Usuario;
import com.grupo2.servicio.EmailService;
import com.grupo2.servicio.UsuarioService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import jakarta.servlet.http.HttpSession;
import com.grupo2.modelo.VerificacionDatos;
import java.util.UUID;
import java.util.Random;

@Controller
public class RegistroController {

    private final UsuarioService usuarioService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public RegistroController(UsuarioService usuarioService, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.usuarioService = usuarioService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    @GetMapping("/registro")
    public String registro() {
        return "registro";
    }

    @PostMapping("/registro")
    public String procesarRegistro(
            @RequestParam String nombre,
            @RequestParam String username,
            @RequestParam String email,
            @RequestParam String password,
            @RequestParam String confirmPassword,
            HttpSession session,
            RedirectAttributes redirectAttributes) {
        
        if (nombre == null || nombre.trim().isEmpty() || 
            username == null || username.trim().isEmpty() || 
            email == null || email.trim().isEmpty() || 
            password == null || password.isEmpty() || 
            confirmPassword == null || confirmPassword.isEmpty()) {
            
            redirectAttributes.addFlashAttribute("error", "Todos los campos son obligatorios");
            redirectAttributes.addFlashAttribute("nombre", nombre);
            redirectAttributes.addFlashAttribute("username", username);
            redirectAttributes.addFlashAttribute("email", email);
            return "redirect:/registro";
        }

        if (!password.equals(confirmPassword) || 
            usuarioService.obtenerPorUsername(username) != null || 
            usuarioService.obtenerPorEmail(email) != null) {

            redirectAttributes.addFlashAttribute("nombre", nombre);
            redirectAttributes.addFlashAttribute("username", username);
            redirectAttributes.addFlashAttribute("email", email);

            if (!password.equals(confirmPassword)) {
                redirectAttributes.addFlashAttribute("error", "Las contraseñas no coinciden");
            } else if (usuarioService.obtenerPorUsername(username) != null) {
                redirectAttributes.addFlashAttribute("error", "El nombre de usuario ya está en uso");
            } else if (usuarioService.obtenerPorEmail(email) != null) {
                redirectAttributes.addFlashAttribute("error", "El correo electrónico ya está registrado");
            }
            return "redirect:/registro";
        }

        Usuario nuevoUsuario = new Usuario();
        nuevoUsuario.setNombre(nombre);
        nuevoUsuario.setUsername(username);
        nuevoUsuario.setEmail(email);
        nuevoUsuario.setPassword(passwordEncoder.encode(password));
        nuevoUsuario.setRol("VISOR"); 

        // Generate 6 digit code
        String codigo = String.format("%06d", new Random().nextInt(999999));
        
        VerificacionDatos datos = new VerificacionDatos(nuevoUsuario, codigo, 15);
        session.setAttribute("verificacionRegistro", datos);
        
        emailService.enviarCorreoVerificacion(nuevoUsuario.getEmail(), nuevoUsuario.getNombre(), codigo);

        return "redirect:/verificar-codigo";
    }

    @GetMapping("/verificar-codigo")
    public String verificarCodigo(HttpSession session) {
        VerificacionDatos datos = (VerificacionDatos) session.getAttribute("verificacionRegistro");
        if (datos == null || datos.isExpirado()) {
            session.removeAttribute("verificacionRegistro");
            return "redirect:/registro";
        }
        return "verificar-codigo";
    }

    @PostMapping("/verificar-codigo")
    public String procesarVerificarCodigo(@RequestParam String codigo, HttpSession session, RedirectAttributes redirectAttributes) {
        VerificacionDatos datos = (VerificacionDatos) session.getAttribute("verificacionRegistro");
        
        if (datos == null) {
            redirectAttributes.addFlashAttribute("error", "Sesión de verificación inválida o no iniciada.");
            return "redirect:/registro";
        }
        
        if (datos.isExpirado()) {
            session.removeAttribute("verificacionRegistro");
            redirectAttributes.addFlashAttribute("error", "El código ha expirado. Por favor, regístrate de nuevo.");
            return "redirect:/registro";
        }
        
        if (!datos.getCodigo().equals(codigo)) {
            redirectAttributes.addFlashAttribute("error", "Código incorrecto.");
            return "redirect:/verificar-codigo";
        }
        
        usuarioService.guardarUsuario(datos.getUsuario());
        session.removeAttribute("verificacionRegistro");
        
        redirectAttributes.addFlashAttribute("exito", "Cuenta creada exitosamente. Ahora puedes iniciar sesión.");
        return "redirect:/login";
    }

    @GetMapping("/olvido-password")
    public String olvidoPassword() {
        return "olvido-password";
    }

    @PostMapping("/olvido-password")
    public String procesarOlvidoPassword(@RequestParam String email, RedirectAttributes redirectAttributes) {
        Usuario usuario = usuarioService.obtenerPorEmail(email);
        
        if (usuario == null) {
            
            redirectAttributes.addFlashAttribute("error", "No se encontró una cuenta con ese correo electrónico");
            return "redirect:/olvido-password";
        }

        
        String nuevaClave = UUID.randomUUID().toString().substring(0, 8);
        
        
        usuario.setPassword(passwordEncoder.encode(nuevaClave));
        usuarioService.guardarUsuario(usuario);
        
        
        emailService.enviarCorreoRecuperacion(usuario.getEmail(), nuevaClave);

        redirectAttributes.addFlashAttribute("exito", "Te hemos enviado un correo con instrucciones para recuperar tu cuenta.");
        return "redirect:/login";
    }
}
