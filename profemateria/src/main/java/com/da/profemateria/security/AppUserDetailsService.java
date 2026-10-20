package com.da.profemateria.security;

import com.da.profemateria.dao.ProfesorDAO;
import com.da.profemateria.dao.UsuarioDAO;
import com.da.profemateria.entity.Profesor;
import com.da.profemateria.entity.Usuario;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

/**
 * Carga el usuario a partir de la tabla "users" + "authorities".
 *
 * <p>El identificador de acceso puede ser:</p>
 * <ul>
 *   <li>el <b>user_id</b> en texto ("1000", "7", ...) — válido para todos,
 *       incluido el administrador; o</li>
 *   <li>el <b>"nombre apellidos"</b> del profesor (columna <code>nombre</code>
 *       + <code>apellidos</code>), sólo para DIRECTOR y PROFESOR. Si ese
 *       nombre corresponde a más de un profesor, el acceso falla para evitar
 *       suplantaciones.</li>
 * </ul>
 *
 * <p>El <code>username</code> interno del principal sigue siendo el user_id
 * numérico, de modo que el resto de la aplicación (roles, dueño de materias)
 * no cambia.</p>
 */
@Service
public class AppUserDetailsService implements UserDetailsService {

    private final UsuarioDAO usuarioDAO;
    private final ProfesorDAO profesorDAO;

    @Autowired
    public AppUserDetailsService(UsuarioDAO usuarioDAO, ProfesorDAO profesorDAO) {
        this.usuarioDAO = usuarioDAO;
        this.profesorDAO = profesorDAO;
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String credencial = username == null ? "" : username.trim();
        if (credencial.isEmpty()) {
            throw new UsernameNotFoundException("Indique su usuario");
        }

        // 1) ¿Es un user_id numérico? (admin, o cualquier usuario por id)
        Usuario usuario = buscarPorId(credencial);
        if (usuario == null) {
            // 2) ¿Es el "nombre apellidos" de un profesor/director?
            usuario = buscarPorNombre(credencial);
        }
        if (usuario == null) {
            throw new UsernameNotFoundException("Usuario o contraseña incorrectos");
        }
        return AppUserDetails.desde(usuario, nombreCompleto(usuario));
    }

    private Usuario buscarPorId(String credencial) {
        try {
            int id = Integer.parseInt(credencial);
            return usuarioDAO.findById(id);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private Usuario buscarPorNombre(String credencial) {
        List<Profesor> coincidencias = profesorDAO.findByNombreCompleto(credencial);
        if (coincidencias.size() != 1) {
            return null; // ninguno, o ambiguo: se rechaza el acceso por nombre
        }
        Profesor profesor = coincidencias.get(0);
        return usuarioDAO.findById(profesor.getIdProfesor());
    }

    /** "nombre apellidos" del profesor, o null para el admin (sin fila). */
    private String nombreCompleto(Usuario usuario) {
        Profesor profesor = profesorDAO.findById(usuario.getUserId());
        if (profesor == null) {
            return null;
        }
        return (profesor.getNombre() + " " + profesor.getApellidos()).trim().replaceAll("\\s+", " ");
    }
}
