package com.grupo2.entidad;

import jakarta.persistence.*;

@Entity
@Table(name = "usuarios")
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String nombre;

    @Column(nullable = false, unique = true, length = 150)
    private String username;

    @Column(nullable = false, unique = true, length = 150)
    private String email;

    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false, length = 50)
    private String rol = "ADMIN";

    @Column(name = "foto_url", length = 255)
    private String fotoUrl;

    
    @Column(name = "notificar_alarmas")
    private Boolean notificarAlarmas = true;

    @Column(name = "notificar_desconexion")
    private Boolean notificarDesconexion = true;

    @Column(name = "notificar_sync_fallida")
    private Boolean notificarSyncFallida = false;

    @Column(name = "reportes_diarios")
    private Boolean reportesDiarios = false;

    public Usuario() {}

    @Transient
    public String getAvatarInitials() {
        if (nombre == null || nombre.trim().isEmpty()) return "U";
        String[] parts = nombre.trim().split("\\s+");
        if (parts.length >= 2) {
            return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        } else {
            return nombre.substring(0, Math.min(2, nombre.length())).toUpperCase();
        }
    }

    @Transient
    public String getAvatarColor() {
        if (nombre == null) return "#6B7280"; 
        String[] colors = {
            "#8B5CF6", 
            "#3B82F6", 
            "#10B981", 
            "#F59E0B", 
            "#EF4444", 
            "#EC4899", 
            "#6366F1", 
            "#14B8A6"  
        };
        int hash = Math.abs(nombre.hashCode());
        return colors[hash % colors.length];
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRol() { return rol; }
    public void setRol(String rol) { this.rol = rol; }
    public String getFotoUrl() { return fotoUrl; }
    public void setFotoUrl(String fotoUrl) { this.fotoUrl = fotoUrl; }
    public Boolean getNotificarAlarmas() { return notificarAlarmas; }
    public void setNotificarAlarmas(Boolean notificarAlarmas) { this.notificarAlarmas = notificarAlarmas; }
    public Boolean getNotificarDesconexion() { return notificarDesconexion; }
    public void setNotificarDesconexion(Boolean notificarDesconexion) { this.notificarDesconexion = notificarDesconexion; }
    public Boolean getNotificarSyncFallida() { return notificarSyncFallida; }
    public void setNotificarSyncFallida(Boolean notificarSyncFallida) { this.notificarSyncFallida = notificarSyncFallida; }
    public Boolean getReportesDiarios() { return reportesDiarios; }
    public void setReportesDiarios(Boolean reportesDiarios) { this.reportesDiarios = reportesDiarios; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
}

