package com.grupo2.entidad;
import jakarta.persistence.*;
@Entity
@Table(name = "estaciones")
public class Estacion {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, unique = true, length = 20)
    private String codigo;
    @Column(nullable = false, length = 100)
    private String nombre;
    @Column(length = 255)
    private String ubicacion;
    private Double latitud;
    private Double longitud;
    @Column(length = 50)
    private String estado;
    public Estacion() {
    }
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    public String getCodigo() {
        return codigo;
    }
    public void setCodigo(String codigo) {
        this.codigo = codigo;
    }
    public String getNombre() {
        return nombre;
    }
    public void setNombre(String nombre) {
        this.nombre = nombre;
    }
    public String getUbicacion() {
        return ubicacion;
    }
    public void setUbicacion(String ubicacion) {
        this.ubicacion = ubicacion;
    }
    public Double getLatitud() {
        return latitud;
    }
    public void setLatitud(Double latitud) {
        this.latitud = latitud;
    }
    public Double getLongitud() {
        return longitud;
    }
    public void setLongitud(Double longitud) {
        this.longitud = longitud;
    }
    public String getEstado() {
        return estado;
    }
    public void setEstado(String estado) {
        this.estado = estado;
    }

    @Column(name = "timeout_senal_valor")
    private Integer timeoutSenalValor;

    @Column(name = "timeout_senal_unidad", length = 20)
    private String timeoutSenalUnidad;

    public Integer getTimeoutSenalValor() {
        return timeoutSenalValor;
    }

    public void setTimeoutSenalValor(Integer timeoutSenalValor) {
        this.timeoutSenalValor = timeoutSenalValor;
    }

    public String getTimeoutSenalUnidad() {
        return timeoutSenalUnidad;
    }

    public void setTimeoutSenalUnidad(String timeoutSenalUnidad) {
        this.timeoutSenalUnidad = timeoutSenalUnidad;
    }
}