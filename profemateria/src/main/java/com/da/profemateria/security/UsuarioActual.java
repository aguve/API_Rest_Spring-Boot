package com.da.profemateria.security;

import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

/** Acceso cómodo a los datos del usuario autenticado en la petición actual. */
public final class UsuarioActual {

    private UsuarioActual() {
    }

    /** El principal si está autenticado; null en caso contrario. */
    public static AppUserDetails obtener() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken
                || !(authentication.getPrincipal() instanceof AppUserDetails usuario)) {
            return null;
        }
        return usuario;
    }

    public static Integer id() {
        AppUserDetails usuario = obtener();
        return usuario == null ? null : usuario.getUserId();
    }

    public static String rol() {
        AppUserDetails usuario = obtener();
        return usuario == null ? null : usuario.getRol();
    }

    public static boolean esAdmin() { return "ADMIN".equals(rol()); }
    public static boolean esDirector() { return "DIRECTOR".equals(rol()); }
    public static boolean esProfesor() { return "PROFESOR".equals(rol()); }
}
