package com.grupo2.repositorio;
import com.grupo2.modelo.LecturaSensor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;
import java.util.List;
@Repository
public class LecturaRepository {
    private final JdbcTemplate jdbcTemplate;
    public LecturaRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }
    private final RowMapper<LecturaSensor> mapper = (rs, rowNum) -> {
        LecturaSensor l = new LecturaSensor();
        l.setId(rs.getLong("id"));
        l.setEstacionId(rs.getInt("estacion_id"));
        l.setFechaHora(rs.getTimestamp("fecha_hora").toLocalDateTime());
        double v;
        v = rs.getDouble("temperatura");
        l.setTemperatura(rs.wasNull() ? null : v);
        v = rs.getDouble("humedad_aire");
        l.setHumedadAire(rs.wasNull() ? null : v);
        v = rs.getDouble("presion");
        l.setPresion(rs.wasNull() ? null : v);
        v = rs.getDouble("velocidad_viento");
        l.setVelocidadViento(rs.wasNull() ? null : v);
        l.setDireccionViento(rs.getString("direccion_viento"));
        v = rs.getDouble("lluvia");
        l.setLluvia(rs.wasNull() ? null : v);
        v = rs.getDouble("humedad_suelo");
        l.setHumedadSuelo(rs.wasNull() ? null : v);
        return l;
    };
    public List<LecturaSensor> findPaginado(int limit, long ultimoId) {
        String sql = """
            SELECT * FROM lecturas_sensores
            WHERE id < ?
            ORDER BY id DESC
            LIMIT ?
        """;
        return jdbcTemplate.query(sql, mapper, ultimoId, limit);
    }
    public List<LecturaSensor> findPrimeraPagina(int limit) {
        String sql = """
            SELECT * FROM lecturas_sensores
            ORDER BY id DESC
            LIMIT ?
        """;
        return jdbcTemplate.query(sql, mapper, limit);
    }
    public long contarTotal() {
        String sql = "SELECT COUNT(*) FROM lecturas_sensores";
        Long total = jdbcTemplate.queryForObject(sql, Long.class);
        return total != null ? total : 0;
    }
    public List<LecturaSensor> findHistorialPorEstacion(int estacionId, int limite) {
        String sql = """
            SELECT * FROM lecturas_sensores
            WHERE estacion_id = ?
            ORDER BY fecha_hora DESC
            LIMIT ?
        """;
        return jdbcTemplate.query(sql, mapper, estacionId, limite);
    }
    public List<LecturaSensor> findHistorialPorRango(int estacionId, java.time.LocalDateTime inicio, java.time.LocalDateTime fin, int limite) {
        String sql = """
            SELECT * FROM lecturas_sensores
            WHERE estacion_id = ? AND fecha_hora >= ? AND fecha_hora <= ?
            ORDER BY fecha_hora DESC
            LIMIT ?
        """;
        return jdbcTemplate.query(sql, mapper, estacionId, java.sql.Timestamp.valueOf(inicio), java.sql.Timestamp.valueOf(fin), limite);
    }
    public List<LecturaSensor> findLecturasParaReporte(int estacionId, java.time.LocalDateTime inicio, java.time.LocalDateTime fin) {
        if (estacionId == 0) {
            String sql = "SELECT * FROM lecturas_sensores WHERE fecha_hora >= ? AND fecha_hora <= ? ORDER BY fecha_hora DESC";
            return jdbcTemplate.query(sql, mapper, java.sql.Timestamp.valueOf(inicio), java.sql.Timestamp.valueOf(fin));
        } else {
            String sql = "SELECT * FROM lecturas_sensores WHERE estacion_id = ? AND fecha_hora >= ? AND fecha_hora <= ? ORDER BY fecha_hora DESC";
            return jdbcTemplate.query(sql, mapper, estacionId, java.sql.Timestamp.valueOf(inicio), java.sql.Timestamp.valueOf(fin));
        }
    }
}