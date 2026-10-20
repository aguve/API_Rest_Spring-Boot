package com.da.profemateria.service;

import com.da.profemateria.dao.ProfesorDAO;
import com.da.profemateria.dao.UsuarioDAO;
import com.da.profemateria.entity.Profesor;
import com.da.profemateria.entity.Usuario;
import com.da.profemateria.security.AppUserDetails;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Altas de usuarios, cambio de contraseña y arranque del administrador.
 * Todas las contraseñas se guardan cifradas con BCrypt.
 */
@Service
public class UsuarioService {

    public static final String ROL_ADMIN = "ROLE_ADMIN";
    public static final String ROL_DIRECTOR = "ROLE_DIRECTOR";
    public static final String ROL_PROFESOR = "ROLE_PROFESOR";

    private final UsuarioDAO usuarioDAO;
    private final ProfesorDAO profesorDAO;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seguridad.id-admin:1000}")
    private int idAdmin;

    @Value("${app.seguridad.password-admin:admin1234}")
    private String passwordAdmin;

    @Value("${app.seguridad.password-por-defecto:1234}")
    private String passwordPorDefecto;

    @Autowired
    public UsuarioService(UsuarioDAO usuarioDAO, ProfesorDAO profesorDAO,
                          PasswordEncoder passwordEncoder) {
        this.usuarioDAO = usuarioDAO;
        this.profesorDAO = profesorDAO;
        this.passwordEncoder = passwordEncoder;
    }

    public int getIdAdmin() { return idAdmin; }

    /** Si ya existe algún ROLE_ADMIN, devuelve su user_id; si no, el id por defecto. */
    public Integer getIdAdminExistente() {
        List<Usuario> admins = usuarioDAO.findByAuthority(ROL_ADMIN);
        return admins.isEmpty() ? null : admins.get(0).getUserId();
    }

    /** Contraseña por defecto con la que se crean directores y profesores. */
    public String getPasswordPorDefecto() { return passwordPorDefecto; }

    /** Contraseña por defecto del administrador. */
    public String getPasswordAdmin() { return passwordAdmin; }

    /**
     * Crea el usuario con id = profesor.id y la contraseña por defecto.
     * passwordChanged queda a false: obligará a cambiarla en el primer login.
     *
     * @return el usuario creado
     */
    @Transactional
    public Usuario crearUsuario(int id, String rol) {
        if (usuarioDAO.existsById(id)) {
            throw new IllegalStateException("Ya existe un usuario con id " + id);
        }
        Usuario usuario = new Usuario();
        usuario.setUserId(id);
        usuario.setPassword(passwordEncoder.encode(passwordPorDefecto));
        usuario.setEnabled(true);
        usuario.setPasswordChanged(false);
        usuario.addAuthority(rol);
        usuarioDAO.save(usuario);
        return usuario;
    }

    /** Cambia la contraseña (en claro → bcrypt) y marca el cambio como hecho. */
    @Transactional
    public Usuario cambiarPassword(int id, String nuevaPassword) {
        Usuario usuario = usuarioDAO.findById(id);
        if (usuario == null) {
            throw new IllegalStateException("No existe el usuario con id " + id);
        }
        usuario.setPassword(passwordEncoder.encode(nuevaPassword));
        usuario.setPasswordChanged(true);
        usuarioDAO.update(usuario);
        return usuario;
    }

    /** Crea el único administrador si todavía no está en la BD. */
    @Transactional
    public void inicializarAdminSiNoExiste() {
        if (usuarioDAO.countByAuthority(ROL_ADMIN) > 0) {
            return;
        }
        if (usuarioDAO.existsById(idAdmin)) {
            throw new IllegalStateException(
                    "El user_id " + idAdmin + " ya está en uso y no se puede crear el administrador.");
        }
        Usuario admin = new Usuario();
        admin.setUserId(idAdmin);
        admin.setPassword(passwordEncoder.encode(passwordAdmin));
        admin.setEnabled(true);
        admin.setPasswordChanged(false);
        admin.addAuthority(ROL_ADMIN);
        usuarioDAO.save(admin);
        System.out.println("[seguridad] Administrador inicial creado -> user_id=" + idAdmin
                + ", contraseña por defecto=" + passwordAdmin);
    }

    /**
     * Construye el principal con su nombre visible ("nombre apellidos" del
     * profesor, o el user_id para el admin). Lo usan login y cambio de
     * contraseña para volver a guardar la sesión con los datos de presentación.
     */
    public AppUserDetails principalDe(Usuario usuario) {
        Profesor profesor = profesorDAO.findById(usuario.getUserId());
        String nombre = profesor == null ? null
                : (profesor.getNombre() + " " + profesor.getApellidos()).trim().replaceAll("\\s+", " ");
        return AppUserDetails.desde(usuario, nombre);
    }
}
