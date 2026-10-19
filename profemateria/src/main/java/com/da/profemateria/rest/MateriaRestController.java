package com.da.profemateria.rest;

import com.da.profemateria.dao.MateriaDAO;
import com.da.profemateria.dao.ProfesorDAO;
import com.da.profemateria.entity.Materia;
import com.da.profemateria.entity.Profesor;
import com.da.profemateria.security.NoAutorizadoException;
import com.da.profemateria.security.UsuarioActual;
import java.util.List;
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
 * API de materias.
 *
 * <ul>
 *   <li><b>ROLE_DIRECTOR</b>: acceso completo y a todas las materias.</li>
 *   <li><b>ROLE_PROFESOR</b>: sólo sus propias materias (id_profesor = su
 *       user_id); al crear o modificar se le asigna obligatoriamente la suya.</li>
 *   <li><b>ROLE_ADMIN</b>: no puede entrar (lo impide la configuración de
 *       seguridad en /api/materias/**).</li>
 * </ul>
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class MateriaRestController {

    private final MateriaDAO materiaDAO;
    private final ProfesorDAO profesorDAO;

    @Autowired
    public MateriaRestController(MateriaDAO materiaDAO, ProfesorDAO profesorDAO) {
        this.materiaDAO = materiaDAO;
        this.profesorDAO = profesorDAO;
    }

    /* ============================== LEER ============================== */

    @GetMapping("/materias")
    public List<Materia> findAll() {
        if (UsuarioActual.esProfesor()) {
            return materiaDAO.findByProfesor(UsuarioActual.id());
        }
        exigirPuedeUsarMaterias();
        return materiaDAO.findAll();
    }

    @GetMapping("/materias/{id}")
    public Materia findById(@PathVariable int id) {
        exigirPuedeUsarMaterias();
        Materia materia = materiaDAO.findById(id);
        exigirPropiaDeProfesor(materia, id);
        return materia;
    }

    /** Profesor que imparte la materia indicada. */
    @GetMapping("/materias/{id}/profesor")
    public Profesor findProfesorByMateria(@PathVariable int id) {
        exigirPuedeUsarMaterias();
        Materia materia = materiaDAO.findById(id);
        exigirPropiaDeProfesor(materia, id);
        return materiaDAO.findProfesorByMateria(id);
    }

    /* ============================= CREAR ============================== */

    @PostMapping("/materias")
    public Materia save(@RequestBody Materia materia) {
        exigirPuedeUsarMaterias();
        if (UsuarioActual.esProfesor()) {
            // El profesor sólo puede darse de alta materias a su nombre.
            materia.setIdMateria(0);
            materia.setIdProfesor(UsuarioActual.id());
        } else {
            exigirProfesorDeLaMateria(materia.getIdProfesor());
        }
        materiaDAO.save(materia);
        return materia;
    }

    /* =========================== ACTUALIZAR =========================== */

    @PutMapping("/materias")
    public Materia update(@RequestBody Materia materia) {
        exigirPuedeUsarMaterias();

        Materia existente = materiaDAO.findById(materia.getIdMateria());
        if (existente == null) {
            // merge() hace upsert: se comporta igual que antes si no existía
            existente = materia;
        }
        exigirPropiaDeProfesor(existente, materia.getIdMateria());

        if (UsuarioActual.esProfesor()) {
            materia.setIdProfesor(UsuarioActual.id());
        } else {
            exigirProfesorDeLaMateria(materia.getIdProfesor());
        }
        materiaDAO.update(materia);
        return materia;
    }

    /* =========================== ELIMINAR ============================= */

    @DeleteMapping("/materias/{id}")
    public String delete(@PathVariable int id) {
        exigirPuedeUsarMaterias();
        Materia materia = materiaDAO.findById(id);
        exigirPropiaDeProfesor(materia, id);
        materiaDAO.delete(id);
        return "Materia eliminada - id: " + id;
    }

    /* ======================= REGLAS POR ROL =========================== */

    /** Admin está excluido (ya por la cadena de seguridad) y por seguridad. */
    private void exigirPuedeUsarMaterias() {
        if (UsuarioActual.esAdmin()) {
            throw new NoAutorizadoException("El administrador no tiene permisos sobre materias ni profesores");
        }
        if (!UsuarioActual.esDirector() && !UsuarioActual.esProfesor()) {
            throw new NoAutorizadoException("No tiene permisos para gestionar materias");
        }
    }

    /** Un profesor sólo puede tocar materias que sean suyas. */
    private void exigirPropiaDeProfesor(Materia materia, int idMateria) {
        if (!UsuarioActual.esProfesor()) {
            return;
        }
        if (materia == null) {
            return; // sin materia no hay dueño que validar
        }
        if (materia.getIdProfesor() != UsuarioActual.id()) {
            throw new NoAutorizadoException(
                    "Sólo puede gestionar sus propias materias (materia " + idMateria + ")");
        }
    }

    /** Sólo se pueden asignar materias a un profesor que exista. */
    private void exigirProfesorDeLaMateria(int idProfesor) {
        if (idProfesor <= 0) {
            throw new NoAutorizadoException("Indique un id de profesor válido");
        }
        if (profesorDAO.findById(idProfesor) == null) {
            throw new NoAutorizadoException("No existe ningún profesor con id " + idProfesor);
        }
    }
}
