package com.da.profemateria.rest;

import com.da.profemateria.dao.ProfesorDAO;
import com.da.profemateria.dao.UsuarioDAO;
import com.da.profemateria.entity.Profesor;
import com.da.profemateria.entity.Usuario;
import com.da.profemateria.security.UsuarioActual;
import com.da.profemateria.service.UsuarioService;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Área exclusiva de ROLE_ADMIN: alta de directores.
 *
 * <p>El director es, a la vez, una fila de la tabla "profesor": su user_id
 * coincide con profesor.id. Se crea con la contraseña por defecto y con
 * password_changed = 0 para obligarle a cambiarla en el primer login.</p>
 */
@RestController
@RequestMapping("/api/admin")
public class AdminRestController {

    private final ProfesorDAO profesorDAO;
    private final UsuarioDAO usuarioDAO;
    private final UsuarioService usuarioService;

    @Autowired
    public AdminRestController(ProfesorDAO profesorDAO,
                               UsuarioDAO usuarioDAO,
                               UsuarioService usuarioService) {
        this.profesorDAO = profesorDAO;
        this.usuarioDAO = usuarioDAO;
        this.usuarioService = usuarioService;
    }

    public record DirectorRequest(String nombre, String apellidos, String direccion) {}

    @PostMapping("/directores")
    public ResponseEntity<Map<String, Object>> crearDirector(@RequestBody DirectorRequest datos) {
        if (!UsuarioActual.esAdmin()) {
            return ResponseEntity.status(403)
                    .body(Map.of("status", 403, "error", "Sólo el administrador puede dar de alta directores"));
        }
        if (datos.nombre() == null || datos.nombre().isBlank()
                || datos.apellidos() == null || datos.apellidos().isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("status", 400, "error", "Nombre y apellidos son obligatorios"));
        }

        String nombreCompleto = (datos.nombre().trim() + " " + datos.apellidos().trim())
                .replaceAll("\\s+", " ");
        if (profesorDAO.existeNombreCompleto(nombreCompleto, null)) {
            return ResponseEntity.badRequest().body(Map.of(
                    "status", 400,
                    "error", "Ya existe un usuario llamado \"" + nombreCompleto + "\". "
                    + "Añada un número o segundo apellido para distinguirlo (p. ej. \""
                    + nombreCompleto + " 2\")."));
        }

        Profesor profesor = new Profesor(
                datos.nombre().trim(),
                datos.apellidos().trim(),
                datos.direccion() == null ? null : datos.direccion().trim());
        profesorDAO.save(profesor);

        Usuario usuario;
        try {
            usuario = usuarioService.crearUsuario(profesor.getIdProfesor(), UsuarioService.ROL_DIRECTOR);
        } catch (RuntimeException ex) {
            profesorDAO.delete(profesor.getIdProfesor());
            throw ex;
        }

        Map<String, Object> respuesta = new LinkedHashMap<>();
        respuesta.put("profesor", profesor);
        respuesta.put("userId", usuario.getUserId());
        respuesta.put("rol", "DIRECTOR");
        respuesta.put("passwordPorDefecto", usuarioService.getPasswordPorDefecto());
        respuesta.put("message", "Director dado de alta. Debe iniciar sesión con la contraseña por defecto "
                + "y cambiarla antes de usar la aplicación.");
        return ResponseEntity.ok(respuesta);
    }

    /** Listado de directores (usuarios con ROLE_DIRECTOR). */
    @GetMapping("/directores")
    public ResponseEntity<List<Map<String, Object>>> listarDirectores() {
        List<Map<String, Object>> respuesta = new ArrayList<>();
        for (Usuario usuario : usuarioDAO.findByAuthority(UsuarioService.ROL_DIRECTOR)) {
            Map<String, Object> fila = new LinkedHashMap<>();
            fila.put("userId", usuario.getUserId());
            fila.put("enabled", usuario.isEnabled());
            fila.put("passwordChanged", usuario.isPasswordChanged());
            fila.put("rol", "DIRECTOR");
            Profesor profesor = profesorDAO.findById(usuario.getUserId());
            if (profesor != null) {
                fila.put("nombre", profesor.getNombre());
                fila.put("apellidos", profesor.getApellidos());
                fila.put("direccion", profesor.getDireccion());
            }
            respuesta.add(fila);
        }
        return ResponseEntity.ok(respuesta);
    }
}
