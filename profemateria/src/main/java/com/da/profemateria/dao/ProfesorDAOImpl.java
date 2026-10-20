package com.da.profemateria.dao;

import com.da.profemateria.entity.Materia;
import com.da.profemateria.entity.Profesor;
import jakarta.persistence.EntityManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.TypedQuery;
import java.util.List;


@Repository
public class ProfesorDAOImpl implements ProfesorDAO {
    private EntityManager entityManager;
    
    @Autowired
    public ProfesorDAOImpl (EntityManager entityManager) {
        this.entityManager = entityManager;
    }
    
    @Override
    @Transactional
    public void save(Profesor profesor) {
        entityManager.persist(profesor);
    }
    
    @Override
    public Profesor findById(int id) {
        return entityManager.find(Profesor.class, id);
    }
    @Override
    @Transactional
    public void update(Profesor profesor) {
        int id = profesor.getIdProfesor();
        Profesor existingProfesor = entityManager.find(Profesor.class, id);
        if (existingProfesor != null){
            existingProfesor.getNombre();
            existingProfesor.getApellidos();
            existingProfesor.getDireccion();
        }
        entityManager.merge(profesor);
    }
    
    @Override
    @Transactional
    public void delete(int id) {
        Profesor profesor = entityManager.find(Profesor.class, id);
        if (profesor != null) {
            entityManager.remove(profesor);
        }
    }
    
    @Override
        public List<Profesor> findAll(){
        TypedQuery<Profesor> query = entityManager.createQuery("From Profesor", Profesor.class);
        return query.getResultList();
    
    }

    @Override
    public List<Materia> findMateriasByProfesor(int idProfesor) {
        TypedQuery<Materia> query = entityManager.createQuery(
                "FROM Materia m WHERE m.idProfesor = :idProfesor", Materia.class);
        query.setParameter("idProfesor", idProfesor);
        return query.getResultList();
    }

    @Override
    public List<Profesor> findByNombreCompleto(String nombreCompleto) {
        TypedQuery<Profesor> query = entityManager.createQuery(
                "FROM Profesor p WHERE LOWER(CONCAT(p.nombre, ' ', p.apellidos)) = LOWER(:nombre) "
                + "ORDER BY p.idProfesor", Profesor.class);
        query.setParameter("nombre", nombreCompleto.trim().replaceAll("\\s+", " "));
        return query.getResultList();
    }

    @Override
    public boolean existeNombreCompleto(String nombreCompleto, Integer exceptoId) {
        TypedQuery<Long> query = entityManager.createQuery(
                "SELECT COUNT(p) FROM Profesor p WHERE LOWER(CONCAT(p.nombre, ' ', p.apellidos)) = LOWER(:nombre) "
                + "AND (:excepto IS NULL OR p.idProfesor <> :excepto)", Long.class);
        query.setParameter("nombre", nombreCompleto.trim().replaceAll("\\s+", " "));
        query.setParameter("excepto", exceptoId);
        return query.getSingleResult() > 0;
    }
}
