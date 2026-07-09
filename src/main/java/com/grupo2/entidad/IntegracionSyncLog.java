package com.grupo2.entidad;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "integracion_sync_log")
public class IntegracionSyncLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;
    @Column(length = 50)
    private String plataforma;
    @Column(name = "estacion_nombre", length = 100)
    private String estacionNombre;
    @Column(name = "registros_enviados")
    private Integer registrosEnviados;
    @Column(length = 20)
    private String estado; 
    @Column(length = 500)
    private String mensaje;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }
    public String getPlataforma() { return plataforma; }
    public void setPlataforma(String plataforma) { this.plataforma = plataforma; }
    public String getEstacionNombre() { return estacionNombre; }
    public void setEstacionNombre(String estacionNombre) { this.estacionNombre = estacionNombre; }
    public Integer getRegistrosEnviados() { return registrosEnviados; }
    public void setRegistrosEnviados(Integer registrosEnviados) { this.registrosEnviados = registrosEnviados; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getMensaje() { return mensaje; }
    public void setMensaje(String mensaje) { this.mensaje = mensaje; }
}
