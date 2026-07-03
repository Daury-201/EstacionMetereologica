package com.grupo2.repositorio;
import com.grupo2.entidad.IntegracionConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;
public interface IntegracionRepository extends JpaRepository<IntegracionConfig, Long> {
    Optional<IntegracionConfig> findByPlataforma(String plataforma);
    List<IntegracionConfig> findByActivaTrue();
    Optional<IntegracionConfig> findByPlataformaIgnoreCase(String plataforma);
    Optional<IntegracionConfig> findFirstByActivaTrue();
}
