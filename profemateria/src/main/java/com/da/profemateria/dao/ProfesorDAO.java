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
}
