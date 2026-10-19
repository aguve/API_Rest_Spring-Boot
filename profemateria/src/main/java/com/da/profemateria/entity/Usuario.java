package com.da.profemateria.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Usuario de Spring Security. Equivale a la tabla <code>users</code>.
 *
 * <p>user_id coincide con <code>profesor.id</code> para los roles
 * ROLE_DIRECTOR y ROLE_PROFESOR (el usuario es, a su vez, una fila de
 * la tabla "profesor"). El único usuario que no existe en "profesor" es
 * ROLE_ADMIN.</p>
 */
@Entity
@Table(name = "users")
public class Usuario {

    @Id
    @Column(name = "user_id")
    private Integer userId;

    @Column(name = "password")
    private String password;

    @Column(name = "enabled")
    private boolean enabled = true;

    /**
     * false = la contraseña por defecto sigue vigente y hay que obligar a
     * cambiarla en el primer login.
     */
    @Column(name = "password_changed")
    private boolean passwordChanged;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "authorities", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "authority")
    private Set<String> authorities = new LinkedHashSet<>();

    public Usuario() {
    }

    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public boolean isPasswordChanged() { return passwordChanged; }
    public void setPasswordChanged(boolean passwordChanged) { this.passwordChanged = passwordChanged; }

    public Set<String> getAuthorities() { return authorities; }
    public void setAuthorities(Set<String> authorities) { this.authorities = authorities; }

    public void addAuthority(String authority) {
        if (this.authorities == null) {
            this.authorities = new LinkedHashSet<>();
        }
        this.authorities.add(authority);
    }

    /** Devuelve "ROLE_ADMIN" | "ROLE_DIRECTOR" | "ROLE_PROFESOR" (la primera de la lista). */
    public String getPrincipalAuthority() {
        if (authorities == null || authorities.isEmpty()) {
            return null;
        }
        return authorities.iterator().next();
    }
}
