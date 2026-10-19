package com.da.profemateria.dao;

import com.da.profemateria.entity.Usuario;
import java.util.List;

public interface UsuarioDAO {

    void save(Usuario usuario);
    Usuario findById(int id);
    void update(Usuario usuario);
    void delete(int id);
    boolean existsById(int id);

    /** Número de usuarios que tienen la autoridad indicada ("ROLE_ADMIN", ...). */
    int countByAuthority(String authority);

    /** Todos los usuarios que tienen la autoridad indicada. */
    List<Usuario> findByAuthority(String authority);
}
