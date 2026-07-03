package com.grupo2.repositorio;
import com.grupo2.entidad.LecturaSensores;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
@Repository
public interface LecturaSensoresRepository extends JpaRepository<LecturaSensores, Long> {
    Optional<LecturaSensores> findTopByEstacionIdOrderByFechaHoraDesc(Integer estacionId);
}
