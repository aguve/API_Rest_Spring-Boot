package com.da.profemateria.security;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;

/**
 * Configuración de Spring Security.
 *
 * <p>Esquema de autorización de la aplicación:</p>
 * <ul>
 *   <li>ROLE_ADMIN      → sólo /api/admin/** (alta de directores).</li>
 *   <li>ROLE_DIRECTOR   → /api/profesor/** y /api/materias/**.</li>
 *   <li>ROLE_PROFESOR   → sólo /api/materias/** (sus propias materias,
 *       se comprueba el dueño dentro del controlador).</li>
 *   <li>ROLE_ADMIN      → NO puede tocar materias ni profesores.</li>
 * </ul>
 *
 * <p>El login es por sesión (cookie JSESSIONID). Mientras
 * <code>users.password_changed = 0</code> sólo se permiten las rutas de
 * /api/auth necesarias para cambiar la contraseña
 * ({@link ForzarCambioPasswordFilter}).</p>
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    /** BCrypt: todas las contraseñas se guardan cifradas. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Usado por AuthRestController para validar usuario/contraseña. */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    /** Repositorio de sesión compartido entre el filtro de seguridad y el login. */
    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http,
                                                   SecurityContextRepository securityContextRepository) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .securityContext(context -> context.securityContextRepository(securityContextRepository))
            .authorizeHttpRequests(auth -> auth
                // Sin sesión todavía: login y recursos estáticos
                .requestMatchers("/api/auth/login").permitAll()
                .requestMatchers("/", "/*.html", "/css/**", "/js/**", "/favicon.ico", "/error").permitAll()

                // Áreas por rol
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .requestMatchers("/api/profesor/**").hasRole("DIRECTOR")
                .requestMatchers("/api/materias/**").hasAnyRole("DIRECTOR", "PROFESOR")

                .requestMatchers("/api/**").authenticated()
                .anyRequest().authenticated())
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(this::respuestaNoAutenticado)
                .accessDeniedHandler(this::respuestaAccesoDenegado))
            .addFilterBefore(new ForzarCambioPasswordFilter(), AuthorizationFilter.class);

        return http.build();
    }

    /** 401 en JSON para las llamadas sin sesión (las consume el frontend). */
    private void respuestaNoAutenticado(jakarta.servlet.http.HttpServletRequest request,
                                        jakarta.servlet.http.HttpServletResponse response,
                                        Exception exception) throws java.io.IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"status\":401,\"error\":\"No autenticado\",\"path\":\"" + request.getRequestURI() + "\"}");
    }

    /** 403 en JSON cuando el rol no permite la operación. */
    private void respuestaAccesoDenegado(jakarta.servlet.http.HttpServletRequest request,
                                         jakarta.servlet.http.HttpServletResponse response,
                                         org.springframework.security.access.AccessDeniedException exception)
            throws java.io.IOException {
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"status\":403,\"error\":\"Acceso denegado\",\"path\":\"" + request.getRequestURI() + "\"}");
    }
}
