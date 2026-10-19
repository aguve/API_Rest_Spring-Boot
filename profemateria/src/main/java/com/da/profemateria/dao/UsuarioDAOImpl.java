package com.da.profemateria.dao;

import com.da.profemateria.entity.Usuario;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class UsuarioDAOImpl implements UsuarioDAO {

    private final EntityManager entityManager;

    @Autowired
    public UsuarioDAOImpl(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    @Override
    @Transactional
    public void save(Usuario usuario) {
        entityManager.persist(usuario);
    }

    @Override
    public Usuario findById(int id) {
        return entityManager.find(Usuario.class, id);
    }

    @Override
    @Transactional
    public void update(Usuario usuario) {
        entityManager.merge(usuario);
    }

    /**
     * Borra primero las filas de "authorities" (FK -> users.user_id) y hace
     * flush para garantizar el orden ante MySQL.
     */
    @Override
    @Transactional
    public void delete(int id) {
        Usuario usuario = entityManager.find(Usuario.class, id);
        if (usuario != null) {
            usuario.getAuthorities().clear();
            entityManager.flush();
            entityManager.remove(usuario);
        }
    }

    @Override
    public boolean existsById(int id) {
        return entityManager.find(Usuario.class, id) != null;
    }

    @Override
    public int countByAuthority(String authority) {
        TypedQuery<Long> query = entityManager.createQuery(
                "SELECT COUNT(u) FROM Usuario u JOIN u.authorities a WHERE a = :authority",
                Long.class);
        query.setParameter("authority", authority);
        return query.getSingleResult().intValue();
    }

    @Override
    public List<Usuario> findByAuthority(String authority) {
        TypedQuery<Usuario> query = entityManager.createQuery(
                "SELECT DISTINCT u FROM Usuario u JOIN u.authorities a WHERE a = :authority ORDER BY u.userId",
                Usuario.class);
        query.setParameter("authority", authority);
        return query.getResultList();
    }
}
