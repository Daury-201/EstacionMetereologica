package com.grupo2.repositorio;
import com.grupo2.entidad.LecturaSensores;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LecturaSensoresRepository extends JpaRepository<LecturaSensores, Long> {
    Optional<LecturaSensores> findTopByEstacionIdOrderByFechaHoraDesc(Integer estacionId);
    
    @Query("SELECT e.nombre, MAX(l.temperatura), MIN(l.temperatura) FROM LecturaSensores l, Estacion e WHERE l.estacionId = e.id AND l.fechaHora >= :startDate GROUP BY e.nombre")
    List<Object[]> findExtremosTermicos(@Param("startDate") LocalDateTime startDate);
    
    @Query("SELECT l.direccionViento, l.velocidadViento FROM LecturaSensores l WHERE l.estacionId = :estacionId AND l.fechaHora >= :startDate AND l.direccionViento IS NOT NULL")
    List<Object[]> findVientoDataByEstacion(@Param("estacionId") Integer estacionId, @Param("startDate") LocalDateTime startDate);
}
