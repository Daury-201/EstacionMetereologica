package com.grupo2.entidad;

import jakarta.persistence.*;

@Entity
@Table(name = "configuracion_sistema")
public class ConfiguracionSistema {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "zona_horaria", length = 50)
    private String zonaHoraria = "America/Santo_Domingo";

    @Column(name = "formato_fecha", length = 50)
    private String formatoFecha = "dd/MM/yyyy HH:mm:ss";

    @Column(name = "timeout_senal_min")
    private Integer timeoutSenalMin = 10;

    @Column(name = "timeout_senal_valor")
    private Integer timeoutSenalValor;

    @Column(name = "timeout_senal_unidad", length = 20)
    private String timeoutSenalUnidad;

    @Column(name = "formato_numerico", length = 20)
    private String formatoNumerico = "es-DO";

    public ConfiguracionSistema() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getZonaHoraria() { return zonaHoraria; }
    public void setZonaHoraria(String zonaHoraria) { this.zonaHoraria = zonaHoraria; }
    public String getFormatoFecha() { return formatoFecha; }
    public void setFormatoFecha(String formatoFecha) { this.formatoFecha = formatoFecha; }
    public String getFormatoNumerico() { return formatoNumerico; }
    public void setFormatoNumerico(String formatoNumerico) { this.formatoNumerico = formatoNumerico; }
    public Integer getTimeoutSenalMin() { return timeoutSenalMin; }
    public void setTimeoutSenalMin(Integer timeoutSenalMin) { this.timeoutSenalMin = timeoutSenalMin; }

    public Integer getTimeoutSenalValor() { 
        if (timeoutSenalValor != null) return timeoutSenalValor;
        if (timeoutSenalMin != null) return timeoutSenalMin; // Fallback to old minutes value
        return 30; // Default 30
    }
    public void setTimeoutSenalValor(Integer timeoutSenalValor) { this.timeoutSenalValor = timeoutSenalValor; }

    public String getTimeoutSenalUnidad() {
        if (timeoutSenalUnidad != null) return timeoutSenalUnidad;
        if (timeoutSenalMin != null) return "minutos"; // If old value exists, it was in minutes
        return "segundos"; // Default seconds
    }
    public void setTimeoutSenalUnidad(String timeoutSenalUnidad) { this.timeoutSenalUnidad = timeoutSenalUnidad; }
}
