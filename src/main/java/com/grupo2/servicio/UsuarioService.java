package com.grupo2.servicio;

import com.grupo2.entidad.Usuario;
import com.grupo2.repositorio.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Service
public class UsuarioService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public List<Usuario> obtenerTodos() {
        return usuarioRepository.findAll();
    }

    public Usuario obtenerPorUsername(String username) {
        return usuarioRepository.findByUsername(username).orElse(null);
    }

    public Usuario obtenerPorEmail(String email) {
        return usuarioRepository.findByEmail(email).orElse(null);
    }

    public Usuario guardarUsuario(Usuario usuario) {
        return usuarioRepository.save(usuario);
    }

    public void actualizarPassword(Usuario usuario, String nuevaPassword) {
        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuarioRepository.save(usuario);
    }

    public Usuario obtenerPorId(Long id) {
        return usuarioRepository.findById(id).orElse(null);
    }

    public void eliminarUsuario(Long id) {
        Usuario usuario = obtenerPorId(id);
        if (usuario != null && "admin".equals(usuario.getUsername())) {
            throw new IllegalArgumentException("No se puede eliminar el usuario administrador por defecto.");
        }
        
        if (usuario != null && usuario.getFotoUrl() != null && !usuario.getFotoUrl().isEmpty()) {
            try {
                String fileName = usuario.getFotoUrl().substring(usuario.getFotoUrl().lastIndexOf("/") + 1);
                Path filePath = Paths.get("uploads", "avatars", fileName);
                Files.deleteIfExists(filePath);
            } catch (Exception e) {
                System.err.println("No se pudo eliminar el avatar: " + e.getMessage());
            }
        }
        
        usuarioRepository.deleteById(id);
    }
}
