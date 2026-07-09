package com.grupo2.servicio;
import com.grupo2.modelo.LecturaSensor;
import com.grupo2.repositorio.LecturaRepository;
import org.springframework.stereotype.Service;
import java.util.List;
@Service
public class LecturaService {
    private final LecturaRepository repo;
    public LecturaService(LecturaRepository repo) {
        this.repo = repo;
    }
    public static final int TAMANIO_PAGINA = 10;
    public List<LecturaSensor> getPrimeraPagina() {
        return repo.findPrimeraPagina(TAMANIO_PAGINA);
    }
    public List<LecturaSensor> getPaginaSiguiente(long ultimoId) {
        return repo.findPaginado(TAMANIO_PAGINA, ultimoId);
    }
    private long cachedTotal = -1;
    private long lastCountTime = 0;

    public synchronized long getTotalRegistros() {
        if (System.currentTimeMillis() - lastCountTime > 5000) {
            cachedTotal = repo.contarTotal();
            lastCountTime = System.currentTimeMillis();
        }
        return cachedTotal;
    }
    public List<LecturaSensor> getHistorialPorEstacion(int estacionId, int limite) {
        return repo.findHistorialPorEstacion(estacionId, limite);
    }
    public List<LecturaSensor> getHistorialPorRango(int estacionId, java.time.LocalDateTime inicio, java.time.LocalDateTime fin, int limite) {
        return repo.findHistorialPorRango(estacionId, inicio, fin, limite);
    }
}