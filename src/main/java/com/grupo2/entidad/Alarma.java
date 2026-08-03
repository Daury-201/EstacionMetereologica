package com.grupo2.entidad;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "alarmas")
public class Alarma {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "estacion_id", nullable = false)
    private Integer estacionId;
    @Column(name = "estacion_nombre", length = 100, nullable = false)
    private String estacionNombre;
    @Column(length = 50, nullable = false)
    private String sensor; 
    @Column(nullable = false)
    private Double valor;
    @Column(name = "umbral_excedido", length = 50, nullable = false)
    private String umbralExcedido; 
    @Column(length = 20, nullable = false)
    private String gravedad; 
    @Column(name = "fecha_hora", nullable = false)
    private LocalDateTime fechaHora;
    @Column(nullable = false)
    private boolean resuelta;
    @Column(name = "fecha_hora_resolucion")
    private LocalDateTime fechaHoraResolucion;
    @Column(name = "duracion_minutos")
    private Long duracionMinutos;
    @Column(columnDefinition = "TEXT")
    private String notas;
    @Column(nullable = false)
    private boolean reconocida;
    @Column(name = "fecha_hora_reconocimiento")
    private LocalDateTime fechaHoraReconocimiento;
    @Column(name = "reconocido_por")
    private String reconocidoPor;
    @Transient
    private boolean actualizacionSilenciosa = false;

    public Alarma() {
        this.fechaHora = LocalDateTime.now();
        this.resuelta = false;
        this.reconocida = false;
    }

    public boolean isActualizacionSilenciosa() { return actualizacionSilenciosa; }
    public void setActualizacionSilenciosa(boolean actualizacionSilenciosa) { this.actualizacionSilenciosa = actualizacionSilenciosa; }

    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public Integer getEstacionId() {
        return estacionId;
    }
    public void setEstacionId(Integer estacionId) {
        this.estacionId = estacionId;
    }
    public String getEstacionNombre() {
        return estacionNombre;
    }
    public void setEstacionNombre(String estacionNombre) {
        this.estacionNombre = estacionNombre;
    }
    public String getSensor() {
        return sensor;
    }
    public void setSensor(String sensor) {
        this.sensor = sensor;
    }
    public Double getValor() {
        return valor;
    }
    public void setValor(Double valor) {
        this.valor = valor;
    }
    public String getUmbralExcedido() {
        return umbralExcedido;
    }
    public void setUmbralExcedido(String umbralExcedido) {
        this.umbralExcedido = umbralExcedido;
    }
    public String getGravedad() {
        return gravedad;
    }
    public void setGravedad(String gravedad) {
        this.gravedad = gravedad;
    }
    public LocalDateTime getFechaHora() {
        return fechaHora;
    }
    public void setFechaHora(LocalDateTime fechaHora) {
        this.fechaHora = fechaHora;
    }
    public boolean isResuelta() {
        return resuelta;
    }
    public void setResuelta(boolean resuelta) {
        this.resuelta = resuelta;
    }
    public LocalDateTime getFechaHoraResolucion() {
        return fechaHoraResolucion;
    }
    public void setFechaHoraResolucion(LocalDateTime fechaHoraResolucion) {
        this.fechaHoraResolucion = fechaHoraResolucion;
    }
    public Long getDuracionMinutos() {
        return duracionMinutos;
    }
    public void setDuracionMinutos(Long duracionMinutos) {
        this.duracionMinutos = duracionMinutos;
    }
    public String getNotas() {
        return notas;
    }
    public void setNotas(String notas) {
        this.notas = notas;
    }
    public boolean isReconocida() {
        return reconocida;
    }
    public void setReconocida(boolean reconocida) {
        this.reconocida = reconocida;
    }
    public LocalDateTime getFechaHoraReconocimiento() {
        return fechaHoraReconocimiento;
    }
    public void setFechaHoraReconocimiento(LocalDateTime fechaHoraReconocimiento) {
        this.fechaHoraReconocimiento = fechaHoraReconocimiento;
    }
    public String getReconocidoPor() {
        return reconocidoPor;
    }
    public void setReconocidoPor(String reconocidoPor) {
        this.reconocidoPor = reconocidoPor;
    }
}
