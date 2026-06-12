package com.grupo2.modelo;

import java.time.LocalDateTime;

public class LecturaSensor {

    private Long id;
    private int estacionId;
    private LocalDateTime fechaHora;
    private Double temperatura;
    private Double humedadAire;
    private Double presion;
    private Double velocidadViento;
    private String direccionViento;
    private Double lluvia;
    private Double humedadSuelo;

    // Getters y Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public int getEstacionId() { return estacionId; }
    public void setEstacionId(int estacionId) { this.estacionId = estacionId; }

    public LocalDateTime getFechaHora() { return fechaHora; }
    public void setFechaHora(LocalDateTime fechaHora) { this.fechaHora = fechaHora; }

    public String getFechaHoraFormateada() {
        if (fechaHora == null) return "-";
        return fechaHora.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"));
    }

    public Double getTemperatura() { return temperatura; }
    public void setTemperatura(Double temperatura) { this.temperatura = temperatura; }

    public Double getHumedadAire() { return humedadAire; }
    public void setHumedadAire(Double humedadAire) { this.humedadAire = humedadAire; }

    public Double getPresion() { return presion; }
    public void setPresion(Double presion) { this.presion = presion; }

    public Double getVelocidadViento() { return velocidadViento; }
    public void setVelocidadViento(Double velocidadViento) { this.velocidadViento = velocidadViento; }

    public String getDireccionViento() { return direccionViento; }
    public void setDireccionViento(String direccionViento) { this.direccionViento = direccionViento; }

    public Double getLluvia() { return lluvia; }
    public void setLluvia(Double lluvia) { this.lluvia = lluvia; }

    public Double getHumedadSuelo() { return humedadSuelo; }
    public void setHumedadSuelo(Double humedadSuelo) { this.humedadSuelo = humedadSuelo; }
}