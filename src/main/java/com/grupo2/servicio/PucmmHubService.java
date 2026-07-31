package com.grupo2.servicio;

import com.grupo2.modelo.LecturaSensor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@Service
public class PucmmHubService {

    @Value("${pucmm.hub.url:https://itt363-hub.eict.ce.pucmm.edu.do/api/}")
    private String apiUrl;

    @Value("${pucmm.hub.token:bDYmf63tj6v2}")
    private String token;

    private final RestTemplate restTemplate;
    private static final DateTimeFormatter FORMATO_FECHA_API = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    public PucmmHubService() {
        this.restTemplate = new RestTemplate();
    }

    public void enviarLectura(LecturaSensor lectura) {
        try {
            // Preparar los headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("SEGURIDAD-TOKEN", token);

            // Preparar el cuerpo (JSON)
            Map<String, Object> body = new HashMap<>();
            body.put("grupo", "2"); 
            
            // Si la estación es la 1 (como pide el JSON), o la que corresponda a lectura.getEstacionId()
            body.put("estacion", String.valueOf(lectura.getEstacionId()));
            
            body.put("fecha", lectura.getFechaHora().format(FORMATO_FECHA_API));
            
            // Validar nulos por si acaso
            body.put("temperatura", lectura.getTemperatura() != null ? lectura.getTemperatura() : 0.0);
            body.put("humedad", lectura.getHumedadAire() != null ? lectura.getHumedadAire() : 0.0);

            HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(body, headers);

            // Hacer el POST
            ResponseEntity<String> response = restTemplate.postForEntity(apiUrl, requestEntity, String.class);
            
            if (response.getStatusCode().is2xxSuccessful()) {
                System.out.println("[API PUCMM] Datos enviados exitosamente al HUB. Status: " + response.getStatusCode().value());
            } else {
                System.err.println("[API PUCMM] Fallo al enviar al HUB. Status: " + response.getStatusCode().value());
            }

        } catch (Exception e) {
            System.err.println("[API PUCMM] Error de conexión: " + e.getMessage());
        }
    }
}
