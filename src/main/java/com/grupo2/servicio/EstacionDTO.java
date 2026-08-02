package com.grupo2.servicio;
public class EstacionDTO {
    private Long id;
    private String codigo;
    private String nombre;
    private String ubicacion;
    private String estado;
    private Double latitud;
    private Double longitud;
    private Double temperatura;
    private Double sensacionTermica;
    private Double humedadAire;
    private Double velocidadViento;
    private String ultimaLectura;
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodigo() { return codigo; }
    public void setCodigo(String codigo) { this.codigo = codigo; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getUbicacion() { return ubicacion; }
    public void setUbicacion(String ubicacion) { this.ubicacion = ubicacion; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public Double getLatitud() { return latitud; }
    public void setLatitud(Double latitud) { this.latitud = latitud; }
    public Double getLongitud() { return longitud; }
    public void setLongitud(Double longitud) { this.longitud = longitud; }
    public Double getTemperatura() { return temperatura; }
    public void setTemperatura(Double temperatura) { this.temperatura = temperatura; }
    public Double getSensacionTermica() { return sensacionTermica; }
    public void setSensacionTermica(Double sensacionTermica) { this.sensacionTermica = sensacionTermica; }
    public Double getHumedadAire() { return humedadAire; }
    public void setHumedadAire(Double humedadAire) { this.humedadAire = humedadAire; }
    public Double getVelocidadViento() { return velocidadViento; }
    public void setVelocidadViento(Double velocidadViento) { this.velocidadViento = velocidadViento; }
    private Double presion;
    private String direccionViento;
    private Double lluvia;
    private Double humedadSuelo;
    public Double getPresion() { return presion; }
    public void setPresion(Double presion) { this.presion = presion; }
    public String getDireccionViento() { return direccionViento; }
    public void setDireccionViento(String direccionViento) { this.direccionViento = direccionViento; }
    public Double getLluvia() { return lluvia; }
    public void setLluvia(Double lluvia) { this.lluvia = lluvia; }
    public Double getHumedadSuelo() { return humedadSuelo; }
    public void setHumedadSuelo(Double humedadSuelo) { this.humedadSuelo = humedadSuelo; }
    private String fechaHoraLectura;
    public String getFechaHoraLectura() { return fechaHoraLectura; }
    public void setFechaHoraLectura(String fechaHoraLectura) { this.fechaHoraLectura = fechaHoraLectura; }
    private java.util.List<String> alarmasActivas = new java.util.ArrayList<>();
    public java.util.List<String> getAlarmasActivas() { return alarmasActivas; }
    public void setAlarmasActivas(java.util.List<String> alarmasActivas) { this.alarmasActivas = alarmasActivas; }
    public String getUltimaLectura() { return ultimaLectura; }
    public void setUltimaLectura(String ultimaLectura) { this.ultimaLectura = ultimaLectura; }

    private Integer timeoutSenalValor;
    private String timeoutSenalUnidad;
    public Integer getTimeoutSenalValor() { return timeoutSenalValor; }
    public void setTimeoutSenalValor(Integer timeoutSenalValor) { this.timeoutSenalValor = timeoutSenalValor; }
    public String getTimeoutSenalUnidad() { return timeoutSenalUnidad; }
    public void setTimeoutSenalUnidad(String timeoutSenalUnidad) { this.timeoutSenalUnidad = timeoutSenalUnidad; }
}
