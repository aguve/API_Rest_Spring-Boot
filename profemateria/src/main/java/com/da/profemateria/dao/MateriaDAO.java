package com.da.profemateria.dao;

import com.da.profemateria.entity.Materia;
import com.da.profemateria.entity.Profesor;
import java.util.List;

public interface MateriaDAO {

    void save(Materia materia);
    Materia findById(int id);
    void update(Materia materia);
    void delete(int id);
    List<Materia> findAll();

    /** Devuelve el profesor que imparte la materia con ese id. */
    Profesor findProfesorByMateria(int idMateria);

}
