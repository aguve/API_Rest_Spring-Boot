package com.da.profemateria.rest;

import com.da.profemateria.dao.ProfesorDAO;
import com.da.profemateria.dao.UsuarioDAO;
import com.da.profemateria.entity.Materia;
import com.da.profemateria.entity.Profesor;
import com.da.profemateria.entity.Usuario;
import com.da.profemateria.security.NoAutorizadoException;
import com.da.profemateria.security.UsuarioActual;
import com.da.profemateria.service.UsuarioService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * API de profesores.
 *
 * <p>Reservada a <b>ROLE_DIRECTOR</b> (lo garantiza la cadena de seguridad).
 * Al dar de alta un profesor se crea además su usuario en las tablas
 * <code>users</code>/<code>authorities</code> con ROLE_PROFESOR, la
 * contraseña por defecto y password_changed = 0.</p>
 *
 * <p>ROLE_ADMIN no tiene acceso: sólo da de alta directores, desde
 * /api/admin/directores.</p>
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ProfesorRestController {

    private final ProfesorDAO profesorDAO;
    private final UsuarioDAO usuarioDAO;
    private final UsuarioService usuarioService;

    @Autowired
    public ProfesorRestController(ProfesorDAO profesorDAO,
                                  UsuarioDAO usuarioDAO,
                                  UsuarioService usuarioService) {
        this.profesorDAO = profesorDAO;
        this.usuarioDAO = usuarioDAO;
        this.usuarioService = usuarioService;
    }

    /* ============================== LEER ============================== */

    @GetMapping("/profesor")
    public List<Profesor> findAll() {
        exigirDirector();
        return profesorDAO.findAll();
    }

    @GetMapping("/profesor/{id}")
    public Profesor findById(@PathVariable int id) {
        exigirDirector();
        return profesorDAO.findById(id);
    }

    /** Materias que imparte el profesor indicado. */
    @GetMapping("/profesor/{id}/materias")
    public List<Materia> findMateriasByProfesor(@PathVariable int id) {
        exigirDirector();
        return profesorDAO.findMateriasByProfesor(id);
    }

    /* ============================= CREAR ============================== */

    /**
     * Alta de profesor: crea la fila en <code>profesor</code> y su usuario
     * con ROLE_PROFESOR (user_id = profesor.id) y la contraseña por defecto.
     */
    @PostMapping("/profesor")
    public Map<String, Object> save(@RequestBody Profesor profesor) {
        exigirDirector();

        String nombreCompleto = (nvl(profesor.getNombre()) + " " + nvl(profesor.getApellidos()))
                .trim().replaceAll("\\s+", " ");
        if (nombreCompleto.isEmpty()) {
            throw new IllegalStateException("Nombre y apellidos son obligatorios");
        }
        if (profesorDAO.existeNombreCompleto(nombreCompleto, null)) {
            throw new IllegalStateException(
                    "Ya existe un profesor llamado \"" + nombreCompleto + "\". "
                    + "Añada un número o segundo apellido para distinguirlo (p. ej. \""
                    + nombreCompleto + " 2\").");
        }

        profesorDAO.save(profesor);

        Usuario usuario;
        try {
            usuario = usuarioService.crearUsuario(profesor.getIdProfesor(), UsuarioService.ROL_PROFESOR);
        } catch (RuntimeException ex) {
            profesorDAO.delete(profesor.getIdProfesor());
            throw ex;
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("idProfesor", profesor.getIdProfesor());
        respuesta.put("nombre", profesor.getNombre());
        respuesta.put("apellidos", profesor.getApellidos());
        respuesta.put("direccion", profesor.getDireccion());
        respuesta.put("userId", usuario.getUserId());
        respuesta.put("rol", "PROFESOR");
        respuesta.put("passwordPorDefecto", usuarioService.getPasswordPorDefecto());
        respuesta.put("message", "Profesor dado de alta. Inicie sesión con la contraseña por defecto "
                + "y cámbiela en el primer acceso.");
        return respuesta;
    }

    /* =========================== ACTUALIZAR =========================== */

    @PutMapping("/profesor")
    public Profesor update(@RequestBody Profesor profesor) {
        exigirDirector();
        if (profesor.getIdProfesor() > 0
                && usuarioDAO.existsById(profesor.getIdProfesor())
                && UsuarioService.ROL_DIRECTOR.equals(
                        usuarioDAO.findById(profesor.getIdProfesor()).getPrincipalAuthority())) {
            throw new NoAutorizadoException(
                    "Un director no puede modificarse a sí mismo desde la gestión de profesores");
        }
        String nombreCompleto = (nvl(profesor.getNombre()) + " " + nvl(profesor.getApellidos()))
                .trim().replaceAll("\\s+", " ");
        if (profesorDAO.existeNombreCompleto(nombreCompleto, profesor.getIdProfesor())) {
            throw new IllegalStateException(
                    "Ya existe otro profesor llamado \"" + nombreCompleto + "\". "
                    + "Añada un número o segundo apellido para distinguirlo.");
        }
        profesorDAO.update(profesor);
        return profesor;
    }

    /* =========================== ELIMINAR ============================= */

    /**
     * Borra el profesor y, si tenía usuario de ROLE_PROFESOR, también sus
     * filas en "authorities"/"users".
     */
    @DeleteMapping("/profesor/{id}")
    public String delete(@PathVariable int id) {
        exigirDirector();

        Usuario usuario = usuarioDAO.existsById(id) ? usuarioDAO.findById(id) : null;
        if (usuario != null && UsuarioService.ROL_DIRECTOR.equals(usuario.getPrincipalAuthority())) {
            throw new NoAutorizadoException(
                    "Un director no puede darse de baja desde la gestión de profesores");
        }

        // Se borra primero el profesor: si aún tiene materias, MySQL lo
        // impide con una violación de clave foránea y no se toca el usuario.
        profesorDAO.delete(id);

        if (usuario != null) {
            usuarioDAO.delete(id);
        }
        return "Profesor eliminado - id " + id;
    }

    /* ======================= REGLAS POR ROL =========================== */

    private void exigirDirector() {
        if (UsuarioActual.esAdmin()) {
            throw new NoAutorizadoException(
                    "El administrador no tiene permisos sobre materias ni profesores");
        }
        if (!UsuarioActual.esDirector()) {
            throw new NoAutorizadoException("Sólo el director puede gestionar profesores");
        }
    }

    /** Cadena segura frente a null, para construir el nombre completo. */
    private static String nvl(String valor) {
        return valor == null ? "" : valor.trim();
    }
}
