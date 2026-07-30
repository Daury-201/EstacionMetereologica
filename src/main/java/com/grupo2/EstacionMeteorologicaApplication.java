package com.grupo2;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.EnableAsync;
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class EstacionMeteorologicaApplication {
	public static void main(String[] args) {
		java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("America/Santo_Domingo"));
		SpringApplication.run(EstacionMeteorologicaApplication.class, args);
	}
}
