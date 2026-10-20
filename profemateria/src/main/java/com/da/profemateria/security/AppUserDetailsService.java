package com.da.profemateria.security;

import com.da.profemateria.dao.UsuarioDAO;
import com.da.profemateria.entity.Usuario;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Carga el usuario a partir de la tabla "users" + "authorities".
 * El nombre de usuario es el user_id en texto ("1000", "7", ...).
 */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UsuarioDAO usuarioDAO;

    @Autowired
    public AppUserDetailsService(UsuarioDAO usuarioDAO) {
        this.usuarioDAO = usuarioDAO;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        try {
            int id = Integer.parseInt(username);
            Usuario usuario = usuarioDAO.findById(id);
            if (usuario == null) {
                throw new UsernameNotFoundException("No existe ningún usuario con id " + username);
            }
            return AppUserDetails.desde(usuario);
        } catch (NumberFormatException ex) {
            throw new UsernameNotFoundException("Identificador de usuario no válido: " + username);
        }
    }
}
