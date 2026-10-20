package com.da.profemateria.rest;

import com.da.profemateria.security.AppUserDetails;
import com.da.profemateria.service.UsuarioService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Endpoints de sesión: login, logout, consulta del usuario actual y cambio
 * de contraseña.
 *
 * <ul>
 *   <li>POST /api/auth/login    → {username, password}  (username = "nombre apellidos" o user_id)</li>
 *   <li>POST /api/auth/logout   → cierra la sesión</li>
 *   <li>GET  /api/auth/me       → datos del usuario autenticado</li>
 *   <li>POST /api/auth/password → {nuevaPassword}</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/auth")
public class AuthRestController {

    private final AuthenticationManager authenticationManager;
    private final SecurityContextRepository securityContextRepository;
    private final UsuarioService usuarioService;

    @Autowired
    public AuthRestController(AuthenticationManager authenticationManager,
                              SecurityContextRepository securityContextRepository,
                              UsuarioService usuarioService) {
        this.authenticationManager = authenticationManager;
        this.securityContextRepository = securityContextRepository;
        this.usuarioService = usuarioService;
    }

    public record LoginRequest(String username, String password) {}
    public record PasswordRequest(String nuevaPassword) {}

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest datos,
                                                     HttpServletRequest request,
                                                     HttpServletResponse response) {
        try {
            Authentication autenticacion = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(datos.username(), datos.password()));

            // Rotación de sesión (protección frente a fijación de sesión)
            HttpSession sesionActual = request.getSession(false);
            if (sesionActual != null) {
                sesionActual.invalidate();
            }
            request.getSession(true);

            SecurityContext contexto = SecurityContextHolder.createEmptyContext();
            contexto.setAuthentication(autenticacion);
            SecurityContextHolder.setContext(contexto);
            securityContextRepository.saveContext(contexto, request, response);

            return ResponseEntity.ok(datosSesion((AppUserDetails) autenticacion.getPrincipal()));
        } catch (AuthenticationException ex) {
            return ResponseEntity.status(401).body(Map.of(
                    "status", 401,
                    "error", "Usuario o contraseña incorrectos"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(HttpServletRequest request,
                                                      HttpServletResponse response) {
        HttpSession sesion = request.getSession(false);
        if (sesion != null) {
            sesion.invalidate();
        }
        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        securityContextRepository.saveContext(contexto, request, response);
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(Map.of("ok", true, "message", "Sesión cerrada"));
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> me(@AuthenticationPrincipal AppUserDetails principal) {
        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("status", 401, "error", "No autenticado"));
        }
        return ResponseEntity.ok(datosSesion(principal));
    }

    /**
     * Cambia la contraseña del usuario autenticado. Al marcarlo en BD
     * (password_changed = 1) se vuelve a guardar el principal en la sesión
     * para que deje de estar bloqueado el resto de endpoints.
     */
    @PostMapping("/password")
    public ResponseEntity<Map<String, Object>> cambiarPassword(
            @AuthenticationPrincipal AppUserDetails principal,
            @RequestBody PasswordRequest datos,
            HttpServletRequest request,
            HttpServletResponse response) {

        if (principal == null) {
            return ResponseEntity.status(401).body(Map.of("status", 401, "error", "No autenticado"));
        }
        String nueva = datos.nuevaPassword() == null ? "" : datos.nuevaPassword().trim();
        if (nueva.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "La contraseña debe tener al menos 6 caracteres"));
        }

        com.da.profemateria.entity.Usuario usuario = usuarioService.cambiarPassword(principal.getUserId(), nueva);

        AppUserDetails actualizado = usuarioService.principalDe(usuario);
        Authentication autenticacion = UsernamePasswordAuthenticationToken.authenticated(
                actualizado, null, actualizado.getAuthorities());
        SecurityContext contexto = SecurityContextHolder.createEmptyContext();
        contexto.setAuthentication(autenticacion);
        SecurityContextHolder.setContext(contexto);
        securityContextRepository.saveContext(contexto, request, response);

        return ResponseEntity.ok(Map.of("ok", true, "message", "Contraseña actualizada"));
    }

    private Map<String, Object> datosSesion(AppUserDetails usuario) {
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("userId", usuario.getUserId());
        cuerpo.put("username", usuario.getUsername());
        cuerpo.put("nombreCompleto", usuario.getNombreCompleto());
        cuerpo.put("authority", usuario.getAuthority());
        cuerpo.put("rol", usuario.getRol());
        cuerpo.put("passwordChanged", usuario.isPasswordChanged());
        cuerpo.put("passwordPorDefecto", usuario.isPasswordChanged() ? null : usuarioService.getPasswordPorDefecto());
        return cuerpo;
    }
}
