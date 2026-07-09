package com.grupo2.controlador;
import com.grupo2.entidad.Alarma;
import com.grupo2.entidad.Umbral;
import com.grupo2.servicio.AlarmaService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
@Controller
public class AlarmaController {
    private final AlarmaService alarmaService;
    private final com.grupo2.repositorio.EstacionRepository estacionRepository;
    public AlarmaController(AlarmaService alarmaService, com.grupo2.repositorio.EstacionRepository estacionRepository) {
        this.alarmaService = alarmaService;
        this.estacionRepository = estacionRepository;
    }
    @GetMapping("/alarmas")
    public String alarmas(Model model) {
        long totalActivas = alarmaService.contarActivas();
        long activasCriticas = alarmaService.contarActivasPorGravedad("CRITICA");
        long activasAdvertencias = alarmaService.contarActivasPorGravedad("ADVERTENCIA");
        long resueltas = alarmaService.contarResueltas();
        long totalHistorico = totalActivas + resueltas;
        model.addAttribute("activasCount", activasCriticas);
        model.addAttribute("advertenciaCount", activasAdvertencias);
        model.addAttribute("resueltasCount", resueltas);
        model.addAttribute("totalCount", totalHistorico);
        model.addAttribute("activas", alarmaService.obtenerActivas());
        model.addAttribute("resueltas", alarmaService.obtenerResueltas());
        model.addAttribute("estaciones", estacionRepository.findAll());
        return "alarmas";
    }
    @GetMapping("/api/alarmas/umbrales")
    @ResponseBody
    public List<Umbral> obtenerUmbrales(@RequestParam(required = false) Integer estacionId) {
        return alarmaService.obtenerUmbralesPorEstacion(estacionId);
    }
    @PostMapping("/api/alarmas/umbrales")
    @ResponseBody
    public ResponseEntity<String> guardarUmbralesAjax(@RequestBody List<Umbral> umbrales) {
        alarmaService.guardarUmbrales(umbrales);
        return ResponseEntity.ok("Configuración guardada correctamente");
    }
    @DeleteMapping("/api/alarmas/umbrales/{sensor}")
    @ResponseBody
    public ResponseEntity<String> borrarUmbral(@PathVariable String sensor, @RequestParam(required = false) Integer estacionId) {
        alarmaService.borrarUmbral(sensor, estacionId);
        return ResponseEntity.ok("Umbral borrado correctamente");
    }
    @PostMapping("/api/alarmas/resolver/{id}")
    @ResponseBody
    public ResponseEntity<String> resolverAlarma(@PathVariable Long id, @RequestParam(required = false, defaultValue = "") String notas) {
        alarmaService.resolverAlarma(id, notas);
        return ResponseEntity.ok("Alarma resuelta correctamente.");
    }
    @GetMapping("/api/alarmas/{id}")
    @ResponseBody
    public ResponseEntity<Alarma> obtenerAlarma(@PathVariable Long id) {
        return alarmaService.obtenerPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/api/alarmas/activas")
    @ResponseBody
    public List<Alarma> obtenerActivas() {
        return alarmaService.obtenerActivas();
    }
    @PostMapping("/api/alarmas/reconocer/{id}")
    @ResponseBody
    public ResponseEntity<String> reconocerAlarma(@PathVariable Long id) {
        alarmaService.reconocerAlarma(id, "Usuario Administrador"); 
        return ResponseEntity.ok("Alarma reconocida correctamente.");
    }
    @PostMapping("/api/alarmas/lote/reconocer")
    @ResponseBody
    public ResponseEntity<String> reconocerMultiples(@RequestBody List<Long> ids) {
        alarmaService.reconocerMultiples(ids, "Usuario Administrador");
        return ResponseEntity.ok(ids.size() + " alarmas reconocidas.");
    }
    @PostMapping("/api/alarmas/lote/resolver")
    @ResponseBody
    public ResponseEntity<String> resolverMultiples(@RequestBody List<Long> ids) {
        alarmaService.resolverMultiples(ids, "Resuelto en lote");
        return ResponseEntity.ok(ids.size() + " alarmas resueltas.");
    }
    @GetMapping("/api/alarmas/historial/filtrar")
    @ResponseBody
    public List<Alarma> filtrarHistorial(@RequestParam(required = false) String sensor,
                                         @RequestParam(required = false) String gravedad,
                                         @RequestParam(required = false) String fechaInicio,
                                         @RequestParam(required = false) String fechaFin) {
        return alarmaService.filtrarHistorial(sensor, gravedad, fechaInicio, fechaFin);
    }
}
