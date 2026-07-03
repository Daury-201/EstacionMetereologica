package com.grupo2.repositorio;
import com.grupo2.entidad.Umbral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface UmbralRepository extends JpaRepository<Umbral, Long> {
    List<Umbral> findByEstacionId(Integer estacionId);
    Optional<Umbral> findByEstacionIdAndSensor(Integer estacionId, String sensor);
}
