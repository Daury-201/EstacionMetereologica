package com.grupo2.entidad;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "lecturas_sensores", indexes = {
    @Index(name = "idx_lectura_estacion_fecha", columnList = "estacion_id, fecha_hora DESC"),
    @Index(name = "idx_lectura_fecha", columnList = "fecha_hora DESC")
})
public class LecturaSensores {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "estacion_id")
    private Integer estacionId;
    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;
    private Double temperatura;
    @Column(name = "sensacion_termica")
    private Double sensacionTermica;
    @Column(name = "humedad_aire")
    private Double humedadAire;
    private Double presion;
    @Column(name = "velocidad_viento")
    private Double velocidadViento;
    @Column(name = "direccion_viento", length = 10)
    private String direccionViento;
    private Double lluvia;
    @Column(name = "humedad_suelo")
    private Double humedadSuelo;
    
    @Column(name = "origen", length = 50)
    private String origen;

    @Column(name = "enviado_pucmm", columnDefinition = "boolean default false")
    private Boolean enviadoPucmm = false;

    public LecturaSensores() {
    }
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
    public LocalDateTime getFechaHora() {
        return fechaHora;
    }
    public void setFechaHora(LocalDateTime fechaHora) {
        this.fechaHora = fechaHora;
    }
    public Double getTemperatura() {
        return temperatura;
    }
    public void setTemperatura(Double temperatura) {
        this.temperatura = temperatura;
    }
    public Double getSensacionTermica() {
        return sensacionTermica;
    }
    public void setSensacionTermica(Double sensacionTermica) {
        this.sensacionTermica = sensacionTermica;
    }
    public Double getHumedadAire() {
        return humedadAire;
    }
    public void setHumedadAire(Double humedadAire) {
        this.humedadAire = humedadAire;
    }
    public Double getPresion() {
        return presion;
    }
    public void setPresion(Double presion) {
        this.presion = presion;
    }
    public Double getVelocidadViento() {
        return velocidadViento;
    }
    public void setVelocidadViento(Double velocidadViento) {
        this.velocidadViento = velocidadViento;
    }
    public String getDireccionViento() {
        return direccionViento;
    }
    public void setDireccionViento(String direccionViento) {
        this.direccionViento = direccionViento;
    }
    public Double getLluvia() {
        return lluvia;
    }
    public void setLluvia(Double lluvia) {
        this.lluvia = lluvia;
    }
    public Double getHumedadSuelo() {
        return humedadSuelo;
    }
    public void setHumedadSuelo(Double humedadSuelo) {
        this.humedadSuelo = humedadSuelo;
    }
    public String getOrigen() {
        return origen;
    }
    public void setOrigen(String origen) {
        this.origen = origen;
    }
    public Boolean getEnviadoPucmm() {
        return enviadoPucmm;
    }
    public void setEnviadoPucmm(Boolean enviadoPucmm) {
        this.enviadoPucmm = enviadoPucmm;
    }
}