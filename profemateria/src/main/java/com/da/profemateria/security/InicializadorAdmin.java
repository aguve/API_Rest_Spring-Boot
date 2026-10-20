package com.da.profemateria.security;

import com.da.profemateria.service.UsuarioService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

/**
 * Crea (si no existe) el único usuario administrador en las tablas
 * "users" / "authorities" al arrancar la aplicación. Se usa BCrypt y
 * password_changed = 0, de forma que deberá cambiar la contraseña en el
 * primer login.
 */
@Component
public class InicializadorAdmin implements ApplicationRunner {

    private final UsuarioService usuarioService;

    @Autowired
    public InicializadorAdmin(UsuarioService usuarioService) {
        this.usuarioService = usuarioService;
    }

    @Override
    public void run(ApplicationArguments args) {
        usuarioService.inicializarAdminSiNoExiste();
    }
}
