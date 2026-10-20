package com.da.profemateria.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Mientras un usuario autenticado tenga <code>password_changed = false</code>
 * (contraseña por defecto sin renovar), sólo se le permiten las peticiones
 * de /api/auth que permiten consultar la sesión y cambiar la contraseña,
 * además de las páginas/recursos estáticos necesarios para mostrar el
 * formulario de cambio.
 * Cualquier otra petición devuelve 403 con code = PASSWORD_CHANGE_REQUIRED.
 */
public class ForzarCambioPasswordFilter extends OncePerRequestFilter {

    public static final String CODE = "PASSWORD_CHANGE_REQUIRED";

    private static final String[] RUTAS_PERMITIDAS = {
            "/api/auth/me",
            "/api/auth/password",
            "/api/auth/logout",
            "/cambiar-password.html",
            "/login.html",
            "/error"
    };

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken)
                && authentication.getPrincipal() instanceof AppUserDetails usuario
                && !usuario.isPasswordChanged()
                && !permitida(request.getRequestURI())) {

            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write(
                    "{\"status\":403,\"error\":\"Debe cambiar su contraseña para continuar\","
                    + "\"code\":\"" + CODE + "\",\"path\":\"" + request.getRequestURI() + "\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean permitida(String uri) {
        for (String ruta : RUTAS_PERMITIDAS) {
            if (uri.equals(ruta)) {
                return true;
            }
        }
        // Recursos estáticos necesarios para renderizar el formulario.
        return uri.startsWith("/css/") || uri.startsWith("/js/");
    }
}
