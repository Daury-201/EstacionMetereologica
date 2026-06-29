package com.grupo2;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class EstacionMeteorologicaApplication {

	public static void main(String[] args) {
		SpringApplication.run(EstacionMeteorologicaApplication.class, args);
	}

}
