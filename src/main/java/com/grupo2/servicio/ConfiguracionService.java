package com.grupo2.servicio;

import com.grupo2.entidad.ConfiguracionSistema;
import com.grupo2.repositorio.ConfiguracionSistemaRepository;
import org.springframework.stereotype.Service;

@Service
public class ConfiguracionService {

    private final ConfiguracionSistemaRepository configRepo;

    public ConfiguracionService(ConfiguracionSistemaRepository configRepo) {
        this.configRepo = configRepo;
    }

    public ConfiguracionSistema obtenerConfiguracionActual() {
        return configRepo.findAll().stream().findFirst().orElse(new ConfiguracionSistema());
    }

    public ConfiguracionSistema guardarConfiguracion(ConfiguracionSistema config) {
        return configRepo.save(config);
    }
}
