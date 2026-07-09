package com.grupo2.controlador;

import com.grupo2.entidad.ConfiguracionSistema;
import com.grupo2.entidad.Usuario;
import com.grupo2.servicio.ConfiguracionService;
import com.grupo2.servicio.UsuarioService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

@Controller
@RequestMapping("/configuracion")
public class ConfiguracionController {

    private final UsuarioService usuarioService;
    private final ConfiguracionService configuracionService;

    public ConfiguracionController(UsuarioService usuarioService, ConfiguracionService configuracionService) {
        this.usuarioService = usuarioService;
        this.configuracionService = configuracionService;
    }

    @GetMapping
    public String index(Model model, @AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails != null) {
            Usuario usuario = usuarioService.obtenerPorUsername(userDetails.getUsername());
            model.addAttribute("usuarioActual", usuario);
        }
        
        ConfiguracionSistema config = configuracionService.obtenerConfiguracionActual();
        model.addAttribute("configSistema", config);
        
        java.util.List<Usuario> usuarios = usuarioService.obtenerTodos();
        model.addAttribute("usuarios", usuarios);
        
        long totalUsuarios = usuarios.size();
        long totalAdmins = usuarios.stream().filter(u -> "ADMIN".equals(u.getRol())).count();
        long totalTecnicos = usuarios.stream().filter(u -> "TECNICO".equals(u.getRol())).count();
        long totalVisores = usuarios.stream().filter(u -> "VISOR".equals(u.getRol())).count();
        
        model.addAttribute("totalUsuarios", totalUsuarios);
        model.addAttribute("totalAdmins", totalAdmins);
        model.addAttribute("totalTecnicos", totalTecnicos);
        model.addAttribute("totalVisores", totalVisores);
        
        return "configuracion";
    }

    
    @PostMapping("/perfil")
    public String guardarPerfil(@RequestParam("nombre") String nombre, @AuthenticationPrincipal UserDetails userDetails, RedirectAttributes redirectAttributes) {
        if (userDetails != null) {
            Usuario usuario = usuarioService.obtenerPorUsername(userDetails.getUsername());
            usuario.setNombre(nombre);
            usuarioService.guardarUsuario(usuario);
            redirectAttributes.addAttribute("success", "perfil");
        }
        return "redirect:/configuracion";
    }

    
    @PostMapping("/perfil/foto")
    public String cambiarFoto(@RequestParam(value = "foto", required = false) MultipartFile foto, 
                              @RequestParam(value = "accion", defaultValue = "subir") String accion,
                              @AuthenticationPrincipal UserDetails userDetails, 
                              RedirectAttributes redirectAttributes) {
        if (userDetails != null) {
            Usuario usuario = usuarioService.obtenerPorUsername(userDetails.getUsername());
            
            if ("eliminar".equals(accion)) {
                
                usuario.setFotoUrl(null);
                usuarioService.guardarUsuario(usuario);
                redirectAttributes.addAttribute("success", "perfil");
                return "redirect:/configuracion";
            }
            
            if (foto != null && !foto.isEmpty()) {
                try {
                    Path uploadDir = Paths.get("uploads/avatars");
                    if (!Files.exists(uploadDir)) {
                        Files.createDirectories(uploadDir);
                    }
                    
                    
                    String originalFileName = foto.getOriginalFilename();
                    String ext = "";
                    if (originalFileName != null && originalFileName.contains(".")) {
                        ext = originalFileName.substring(originalFileName.lastIndexOf("."));
                    }
                    
                    String fileName = "user_" + usuario.getId() + "_" + System.currentTimeMillis() + ext;
                    Path filePath = uploadDir.resolve(fileName);
                    Files.copy(foto.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
                    
                    usuario.setFotoUrl("/uploads/avatars/" + fileName);
                    usuarioService.guardarUsuario(usuario);
                    
                    redirectAttributes.addAttribute("success", "perfil");
                } catch (Exception e) {
                    redirectAttributes.addFlashAttribute("error", "Error al guardar la imagen");
                }
            }
        }
        return "redirect:/configuracion";
    }

    @PostMapping("/sistema")
    public String guardarSistema(@RequestParam("zonaHoraria") String zonaHoraria,
                                 @RequestParam("formatoFecha") String formatoFecha,
                                 @RequestParam("formatoNumerico") String formatoNumerico,
                                 @RequestParam(value = "timeoutSenalMin", required = false) Integer timeout) {
        ConfiguracionSistema config = configuracionService.obtenerConfiguracionActual();
        config.setZonaHoraria(zonaHoraria);
        config.setFormatoFecha(formatoFecha);
        config.setFormatoNumerico(formatoNumerico);
        if (timeout != null) {
            config.setTimeoutSenalMin(timeout);
        }
        configuracionService.guardarConfiguracion(config);
        
        return "redirect:/configuracion?success=sistema&tab=sistema";
    }

    @PostMapping("/sistema/reset")
    public String resetSistema(RedirectAttributes redirectAttributes) {
        ConfiguracionSistema config = configuracionService.obtenerConfiguracionActual();
        config.setZonaHoraria("America/Santo_Domingo");
        config.setFormatoFecha("dd/MM/yyyy HH:mm:ss");
        config.setFormatoNumerico("es-DO");
        config.setTimeoutSenalMin(10);
        configuracionService.guardarConfiguracion(config);
        
        redirectAttributes.addAttribute("success", "sistema");
        return "redirect:/configuracion?tab=sistema";
    }
    @PostMapping("/notificaciones")
    public String guardarNotificaciones(@RequestParam(defaultValue = "false") boolean notificarAlarmas,
                                        @RequestParam(defaultValue = "false") boolean notificarDesconexion,
                                        @RequestParam(defaultValue = "false") boolean notificarSyncFallida,
                                        @RequestParam(defaultValue = "false") boolean reportesDiarios,
                                        @AuthenticationPrincipal UserDetails userDetails,
                                        RedirectAttributes redirectAttributes) {
        if (userDetails != null) {
            Usuario usuario = usuarioService.obtenerPorUsername(userDetails.getUsername());
            usuario.setNotificarAlarmas(notificarAlarmas);
            usuario.setNotificarDesconexion(notificarDesconexion);
            usuario.setNotificarSyncFallida(notificarSyncFallida);
            usuario.setReportesDiarios(reportesDiarios);
            usuarioService.guardarUsuario(usuario);
            redirectAttributes.addAttribute("success", "notificaciones");
        }
        return "redirect:/configuracion?tab=notificaciones";
    }

    @PostMapping("/seguridad/password")
    public String cambiarPassword(@RequestParam("currentPassword") String currentPassword,
                                  @RequestParam("newPassword") String newPassword,
                                  @RequestParam("confirmPassword") String confirmPassword,
                                  @AuthenticationPrincipal UserDetails userDetails,
                                  RedirectAttributes redirectAttributes) {
        if (userDetails != null) {
            Usuario usuario = usuarioService.obtenerPorUsername(userDetails.getUsername());
            
            
            org.springframework.security.crypto.password.PasswordEncoder encoder = new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
            if (!encoder.matches(currentPassword, usuario.getPassword())) {
                redirectAttributes.addAttribute("error_pwd", "La contraseña actual es incorrecta");
                return "redirect:/configuracion?tab=seguridad";
            }
            
            if (encoder.matches(newPassword, usuario.getPassword())) {
                redirectAttributes.addAttribute("error_pwd", "La nueva contraseña debe ser diferente a la actual");
                return "redirect:/configuracion?tab=seguridad";
            }
            
            
            if (!newPassword.equals(confirmPassword)) {
                redirectAttributes.addAttribute("error_pwd", "Las contraseñas nuevas no coinciden");
                return "redirect:/configuracion?tab=seguridad";
            }
            
            
            usuario.setPassword(encoder.encode(newPassword));
            usuarioService.guardarUsuario(usuario);
            redirectAttributes.addAttribute("success_pwd", "true");
        }
        return "redirect:/configuracion?tab=seguridad";
    }
}
