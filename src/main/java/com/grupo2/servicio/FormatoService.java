package com.grupo2.servicio;

import com.grupo2.entidad.ConfiguracionSistema;
import org.springframework.stereotype.Service;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

@Service
public class FormatoService {

    private final ConfiguracionService configuracionService;

    public FormatoService(ConfiguracionService configuracionService) {
        this.configuracionService = configuracionService;
    }

    public String formatDate(LocalDateTime fechaHora) {
        if (fechaHora == null) return "--";
        ConfiguracionSistema config = configuracionService.obtenerConfiguracionActual();
        try {
            ZoneId zoneId = ZoneId.of(config.getZonaHoraria());
            ZonedDateTime zdt = fechaHora.atZone(ZoneId.systemDefault()).withZoneSameInstant(zoneId);
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern(config.getFormatoFecha());
            return zdt.format(formatter);
        } catch (Exception e) {
            DateTimeFormatter defaultFormatter = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");
            return fechaHora.format(defaultFormatter);
        }
    }

    public String formatNumber(Number valor, int maxDecimals) {
        if (valor == null) return "--";
        ConfiguracionSistema config = configuracionService.obtenerConfiguracionActual();
        Locale locale = Locale.forLanguageTag(config.getFormatoNumerico() != null ? config.getFormatoNumerico() : "es-DO");
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(locale);
        
        StringBuilder pattern = new StringBuilder("#,##0");
        if (maxDecimals > 0) {
            pattern.append(".");
            for (int i = 0; i < maxDecimals; i++) {
                pattern.append("#");
            }
        }
        
        DecimalFormat df = new DecimalFormat(pattern.toString(), symbols);
        return df.format(valor);
    }
    
    public String formatNumber(Number valor) {
        return formatNumber(valor, 2);
    }
}
