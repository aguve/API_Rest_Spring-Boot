package com.da.profemateria.security;

/** Respuesta del backend cuando el rol no permite ejecutar una operación. */
public class NoAutorizadoException extends RuntimeException {

    public NoAutorizadoException(String mensaje) {
        super(mensaje);
    }
}
