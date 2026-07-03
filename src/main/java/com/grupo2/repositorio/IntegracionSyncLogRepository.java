package com.grupo2.repositorio;
import com.grupo2.entidad.IntegracionSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface IntegracionSyncLogRepository extends JpaRepository<IntegracionSyncLog, Long> {
    List<IntegracionSyncLog> findTop20ByOrderByFechaHoraDesc();
    long countByFechaHoraAfter(java.time.LocalDateTime fecha);
    IntegracionSyncLog findTop1ByOrderByFechaHoraDesc();
}
