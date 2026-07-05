package com.grupo2.controlador;

import com.grupo2.entidad.Usuario;
import com.grupo2.servicio.UsuarioService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
@RequestMapping("/configuracion/usuarios")
public class UsuarioController {

    private final UsuarioService usuarioService;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(UsuarioService usuarioService, PasswordEncoder passwordEncoder) {
        this.usuarioService = usuarioService;
        this.passwordEncoder = passwordEncoder;
    }

    @PostMapping("/guardar")
    public String guardarUsuario(@ModelAttribute Usuario usuario, 
                                 @RequestParam(value = "passwordRaw", required = false) String passwordRaw, 
                                 RedirectAttributes redirectAttributes) {
        
        
        Usuario userPorUsername = usuarioService.obtenerPorUsername(usuario.getUsername());
        Usuario userPorEmail = usuarioService.obtenerPorEmail(usuario.getEmail());

        if (usuario.getId() != null) {
            
            if (userPorUsername != null && !userPorUsername.getId().equals(usuario.getId())) {
                redirectAttributes.addAttribute("error_usuario", "El nombre de usuario ya está en uso");
                return "redirect:/configuracion?tab=usuarios";
            }
            if (userPorEmail != null && !userPorEmail.getId().equals(usuario.getId())) {
                redirectAttributes.addAttribute("error_usuario", "El correo electrónico ya está registrado");
                return "redirect:/configuracion?tab=usuarios";
            }

            Usuario existente = usuarioService.obtenerPorId(usuario.getId());
            if (existente != null) {
                existente.setNombre(usuario.getNombre());
                existente.setUsername(usuario.getUsername());
                existente.setEmail(usuario.getEmail());
                existente.setRol(usuario.getRol());
                if (passwordRaw != null && !passwordRaw.trim().isEmpty()) {
                    existente.setPassword(passwordEncoder.encode(passwordRaw));
                }
                usuarioService.guardarUsuario(existente);
                redirectAttributes.addAttribute("success", "usuario_editado");
            }
        } else {
            
            if (userPorUsername != null) {
                redirectAttributes.addAttribute("error_usuario", "El nombre de usuario ya está en uso");
                return "redirect:/configuracion?tab=usuarios";
            }
            if (userPorEmail != null) {
                redirectAttributes.addAttribute("error_usuario", "El correo electrónico ya está registrado");
                return "redirect:/configuracion?tab=usuarios";
            }

            if (passwordRaw != null && !passwordRaw.trim().isEmpty()) {
                usuario.setPassword(passwordEncoder.encode(passwordRaw));
            } else {
                usuario.setPassword(passwordEncoder.encode("12345678")); 
            }
            usuarioService.guardarUsuario(usuario);
            redirectAttributes.addAttribute("success", "usuario_creado");
        }
        
        return "redirect:/configuracion?tab=usuarios";
    }

    @PostMapping("/eliminar/{id}")
    public String eliminarUsuario(@PathVariable Long id, RedirectAttributes redirectAttributes) {
        usuarioService.eliminarUsuario(id);
        redirectAttributes.addAttribute("success", "usuario_eliminado");
        return "redirect:/configuracion?tab=usuarios";
    }
}
