package com.da.profemateria.dao;

import com.da.profemateria.entity.Materia;
import com.da.profemateria.entity.Profesor;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;
import org.springframework.stereotype.Repository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class MateriaDAOImpl implements MateriaDAO {
    
    private EntityManager entityManager;

    @Autowired
    public MateriaDAOImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public void save(Materia materia) {
        entityManager.persist(materia);
    }

    @Override
    public Materia findById(int id) {
        return entityManager.find(Materia.class, id);
    }

    @Override
    @Transactional
    public void update(Materia materia) {
        int id = materia.getIdMateria();
        Materia existingMateria = entityManager.find(Materia.class, id);
        if (existingMateria != null) {
            existingMateria.setNombre(materia.getNombre());
            existingMateria.setCreditos(materia.getCreditos());
            existingMateria.setHorasCatedra(materia.getHorasCatedra());
            existingMateria.setIdProfesor(materia.getIdProfesor());
        }
        entityManager.merge(materia);
    }

    @Override
    @Transactional
    public void delete(int id) {
        Materia materia = entityManager.find(Materia.class, id);
        if (materia != null) {
            entityManager.remove(materia);
        }
    }

    @Override
    public List<Materia> findAll() {
        TypedQuery<Materia> query = entityManager.createQuery("FROM Materia", Materia.class);
        return query.getResultList();
    }

    @Override
    public List<Materia> findByProfesor(int idProfesor) {
        TypedQuery<Materia> query = entityManager.createQuery(
                "FROM Materia m WHERE m.idProfesor = :idProfesor ORDER BY m.idMateria", Materia.class);
        query.setParameter("idProfesor", idProfesor);
        return query.getResultList();
    }

    @Override
    public Profesor findProfesorByMateria(int idMateria) {
        Materia materia = entityManager.find(Materia.class, idMateria);
        return (materia != null) ? materia.getProfesor() : null;
    }

}
