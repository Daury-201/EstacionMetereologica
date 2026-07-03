package com.grupo2.entidad;
import jakarta.persistence.*;
@Entity
@Table(name = "configuracion_umbrales_v2")
public class Umbral {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "estacion_id")
    private Integer estacionId;
    @Column(length = 50, nullable = false)
    private String sensor;
    @Column(name = "adv_min_valor")
    private Double advMinValor;
    @Column(name = "adv_max_valor")
    private Double advMaxValor;
    @Column(name = "crit_min_valor")
    private Double critMinValor;
    @Column(name = "crit_max_valor")
    private Double critMaxValor;
    public Umbral() {
    }
    public Umbral(Integer estacionId, String sensor, Double advMinValor, Double advMaxValor, Double critMinValor, Double critMaxValor) {
        this.estacionId = estacionId;
        this.sensor = sensor;
        this.advMinValor = advMinValor;
        this.advMaxValor = advMaxValor;
        this.critMinValor = critMinValor;
        this.critMaxValor = critMaxValor;
    }
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Integer getEstacionId() { return estacionId; }
    public void setEstacionId(Integer estacionId) { this.estacionId = estacionId; }
    public String getSensor() { return sensor; }
    public void setSensor(String sensor) { this.sensor = sensor; }
    public Double getAdvMinValor() { return advMinValor; }
    public void setAdvMinValor(Double advMinValor) { this.advMinValor = advMinValor; }
    public Double getAdvMaxValor() { return advMaxValor; }
    public void setAdvMaxValor(Double advMaxValor) { this.advMaxValor = advMaxValor; }
    public Double getCritMinValor() { return critMinValor; }
    public void setCritMinValor(Double critMinValor) { this.critMinValor = critMinValor; }
    public Double getCritMaxValor() { return critMaxValor; }
    public void setCritMaxValor(Double critMaxValor) { this.critMaxValor = critMaxValor; }
}
