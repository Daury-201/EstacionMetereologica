package com.grupo2.modelo;

import com.grupo2.entidad.Usuario;
import java.time.LocalDateTime;

public class VerificacionDatos {
    private Usuario usuario;
    private String codigo;
    private LocalDateTime fechaExpiracion;

    public VerificacionDatos(Usuario usuario, String codigo, int minutosValidez) {
        this.usuario = usuario;
        this.codigo = codigo;
        this.fechaExpiracion = LocalDateTime.now().plusMinutes(minutosValidez);
    }

    public boolean isExpirado() {
        return LocalDateTime.now().isAfter(fechaExpiracion);
    }

    public Usuario getUsuario() {
        return usuario;
    }

    public String getCodigo() {
        return codigo;
    }

    public LocalDateTime getFechaExpiracion() {
        return fechaExpiracion;
    }
}
