package com.grupo2.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public org.springframework.security.authentication.dao.DaoAuthenticationProvider authenticationProvider(org.springframework.security.core.userdetails.UserDetailsService userDetailsService) {
        org.springframework.security.authentication.dao.DaoAuthenticationProvider authProvider = new org.springframework.security.authentication.dao.DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        authProvider.setHideUserNotFoundExceptions(false);
        return authProvider;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf
                .ignoringRequestMatchers("/api/**", "/ws-estacion/**", "/h2-console/**", "/reportes/**")
            )
            .headers(headers -> headers.frameOptions(org.springframework.security.config.annotation.web.configurers.HeadersConfigurer.FrameOptionsConfig::disable)) 
            .authorizeHttpRequests(authz -> authz
                
                .requestMatchers("/css/**", "/js/**", "/img/**", "/webjars/**", "/assets/**", "/registro", "/olvido-password").permitAll()
                
                .requestMatchers("/api/lecturas/**").permitAll()
                
                .requestMatchers("/ws-estacion/**").permitAll()
                
                .requestMatchers("/h2-console/**", "/error").permitAll()
                
                .requestMatchers("/configuracion/usuarios/**").hasAuthority("ROLE_ADMIN")
                .requestMatchers("/estaciones/guardar", "/estaciones/eliminar/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_TECNICO")
                .requestMatchers("/alarmas/configuracion/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_TECNICO")
                .requestMatchers("/configuracion/**").authenticated()
                .requestMatchers("/integracion/**").hasAnyAuthority("ROLE_ADMIN", "ROLE_TECNICO")
                
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginPage("/login")
                .loginProcessingUrl("/login")
                .successHandler((request, response, authentication) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    response.getWriter().write("{\"success\": true, \"redirectUrl\": \"/\"}");
                })
                .failureHandler((request, response, exception) -> {
                    response.setContentType("application/json;charset=UTF-8");
                    String errorType = "true";
                    Throwable rootCause = exception;
                    if (exception instanceof org.springframework.security.authentication.InternalAuthenticationServiceException && exception.getCause() != null) {
                        rootCause = exception.getCause();
                    }
                    if (rootCause instanceof org.springframework.security.core.userdetails.UsernameNotFoundException) {
                        errorType = "not_found";
                    } else if (rootCause instanceof org.springframework.security.authentication.BadCredentialsException || exception instanceof org.springframework.security.authentication.BadCredentialsException) {
                        errorType = "bad_credentials";
                    }
                    response.getWriter().write("{\"success\": false, \"error\": \"" + errorType + "\"}");
                })
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/logout")
                .logoutSuccessUrl("/login?logout=true")
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
                .permitAll()
            );
            
        return http.build();
    }
}
