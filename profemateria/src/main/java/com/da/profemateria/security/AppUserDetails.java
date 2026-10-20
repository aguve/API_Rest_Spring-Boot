package com.da.profemateria.security;

import com.da.profemateria.entity.Usuario;
import java.util.Collection;
import java.util.List;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

/**
 * UserDetails de la aplicación. El "username" es el propio user_id (en texto),
 * de forma que AuthenticationManager autentica contra la tabla "users".
 *
 * <p>Para DIRECTOR y PROFESOR se guarda además su nombre completo (de la
 * tabla "profesor") con fines de presentación; el ADMIN no tiene fila en esa
 * tabla y usa su id como nombre visible.</p>
 */
public class AppUserDetails implements UserDetails {

    private final int userId;
    private final String password;
    private final boolean enabled;
    private final boolean passwordChanged;
    private final String authority;
    private final String nombreCompleto;

    public AppUserDetails(int userId, String password, boolean enabled,
                          boolean passwordChanged, String authority,
                          String nombreCompleto) {
        this.userId = userId;
        this.password = password;
        this.enabled = enabled;
        this.passwordChanged = passwordChanged;
        this.authority = authority;
        this.nombreCompleto = nombreCompleto;
    }

    public static AppUserDetails desde(Usuario usuario, String nombreCompleto) {
        return new AppUserDetails(
                usuario.getUserId(),
                usuario.getPassword(),
                usuario.isEnabled(),
                usuario.isPasswordChanged(),
                usuario.getPrincipalAuthority(),
                nombreCompleto);
    }

    public int getUserId() { return userId; }
    public boolean isPasswordChanged() { return passwordChanged; }
    public String getAuthority() { return authority; }
    /** Nombre visible: "nombre apellidos" o, si no hay, el propio user_id. */
    public String getNombreCompleto() {
        return nombreCompleto == null || nombreCompleto.isBlank()
                ? String.valueOf(userId) : nombreCompleto;
    }
    public String getRol() {
        return authority == null ? null : authority.replace("ROLE_", "");
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authority == null ? List.of() : List.of(new SimpleGrantedAuthority(authority));
    }

    @Override
    public String getPassword() { return password; }

    @Override
    public String getUsername() { return String.valueOf(userId); }

    @Override
    public boolean isEnabled() { return enabled; }
}
