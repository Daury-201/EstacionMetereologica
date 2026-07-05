package com.grupo2.config;

import com.grupo2.entidad.ConfiguracionSistema;
import com.grupo2.entidad.Usuario;
import com.grupo2.repositorio.ConfiguracionSistemaRepository;
import com.grupo2.repositorio.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final ConfiguracionSistemaRepository configRepo;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(UsuarioRepository usuarioRepository, ConfiguracionSistemaRepository configRepo, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.configRepo = configRepo;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        
        if (configRepo.count() == 0) {
            ConfiguracionSistema config = new ConfiguracionSistema();
            configRepo.save(config);
        }

        
        if (usuarioRepository.findByUsername("admin").isEmpty()) {
            Usuario admin = new Usuario();
            admin.setNombre("Grupo 2");
            admin.setUsername("admin"); 
            admin.setEmail("dauryrodriguez2005@gmail.com"); 
            admin.setPassword(passwordEncoder.encode("admin123")); 
            admin.setRol("ADMIN");
            admin.setFotoUrl("G2");
            usuarioRepository.save(admin);

            System.out.println("Username: admin");
            System.out.println("Password: admin123");

        }
    }
}
