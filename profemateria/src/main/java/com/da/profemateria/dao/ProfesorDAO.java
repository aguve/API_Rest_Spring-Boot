package com.da.profemateria.dao;

import com.da.profemateria.entity.Materia;
import com.da.profemateria.entity.Profesor;
import java.util.List;

/**
 *
 * @author UsuarioM
 */
public interface ProfesorDAO {
    void save(Profesor profesor);
    Profesor findById(int id);
    void update (Profesor profesor);
    void delete(int id);
    List<Profesor> findAll();

    /** Devuelve las materias que imparte el profesor con ese id. */
    List<Materia> findMateriasByProfesor(int idProfesor);

    /**
     * Busca profesores por nombre (para el login por "nombre apellidos").
     * La comparación no distingue mayúsculas y se hace sobre el nombre y los
     * apellidos concatenados con un espacio.
     */
    List<Profesor> findByNombreCompleto(String nombreCompleto);

    /** True si ya existe un profesor con ese "nombre apellidos" (sin distinguir mayúsculas). */
    boolean existeNombreCompleto(String nombreCompleto, Integer exceptoId);
}
