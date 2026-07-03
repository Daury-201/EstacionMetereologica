package com.grupo2.repositorio;
import com.grupo2.entidad.Alarma;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
@Repository
public interface AlarmaRepository extends JpaRepository<Alarma, Long> {
    List<Alarma> findByResueltaFalseOrderByFechaHoraDesc();
    List<Alarma> findByResueltaTrueOrderByFechaHoraResolucionDesc();
    long countByResueltaFalse();
    long countByResueltaFalseAndGravedad(String gravedad);
    long countByResueltaTrue();
    Optional<Alarma> findFirstByEstacionIdAndSensorAndResueltaFalse(Integer estacionId, String sensor);
    List<Alarma> findByEstacionIdAndResueltaFalse(Integer estacionId);
    List<Alarma> findByEstacionIdAndFechaHoraBetween(Integer estacionId, java.time.LocalDateTime inicio, java.time.LocalDateTime fin);
    List<Alarma> findByFechaHoraBetween(java.time.LocalDateTime inicio, java.time.LocalDateTime fin);
}
