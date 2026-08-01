package com.grupo2.entidad;
import jakarta.persistence.*;
import java.time.LocalDateTime;
@Entity
@Table(name = "integracion_config")
public class IntegracionConfig {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(length = 50, nullable = false, unique = true)
    private String plataforma;
    @Column(name = "intervalo_min")
    private Integer intervaloMin = 10;
    @Column(name = "estaciones_ids")
    private String estacionesIds;
    @Column(name = "activa")
    private Boolean activa = false;
    @Column(name = "webhook_url")
    private String webhookUrl;
    @Column(name = "token")
    private String token;
    @Column(name = "ultima_sincronizacion")
    private LocalDateTime ultimaSincronizacion;
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getPlataforma() { return plataforma; }
    public void setPlataforma(String plataforma) { this.plataforma = plataforma; }
    public Integer getIntervaloMin() { return intervaloMin; }
    public void setIntervaloMin(Integer intervaloMin) { this.intervaloMin = intervaloMin; }
    public String getEstacionesIds() { return estacionesIds; }
    public void setEstacionesIds(String estacionesIds) { this.estacionesIds = estacionesIds; }
    public Boolean getActiva() { return activa; }
    public void setActiva(Boolean activa) { this.activa = activa; }
    public String getWebhookUrl() { return webhookUrl; }
    public void setWebhookUrl(String webhookUrl) { this.webhookUrl = webhookUrl; }
    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public LocalDateTime getUltimaSincronizacion() { return ultimaSincronizacion; }
    public void setUltimaSincronizacion(LocalDateTime ultimaSincronizacion) { this.ultimaSincronizacion = ultimaSincronizacion; }
}
