package com.da.profemateria.rest;

import com.da.profemateria.security.NoAutorizadoException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Devuelve los errores de autorización de negocio en JSON (no en HTML). */
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NoAutorizadoException.class)
    public ResponseEntity<Map<String, Object>> noAutorizado(NoAutorizadoException ex,
                                                            jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("status", HttpStatus.FORBIDDEN.value());
        cuerpo.put("error", "Acceso denegado");
        cuerpo.put("message", ex.getMessage());
        cuerpo.put("path", request.getRequestURI());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(cuerpo);
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> estadoInvalido(IllegalStateException ex,
                                                              jakarta.servlet.http.HttpServletRequest request) {
        Map<String, Object> cuerpo = new LinkedHashMap<>();
        cuerpo.put("status", HttpStatus.BAD_REQUEST.value());
        cuerpo.put("error", "Solicitud no válida");
        cuerpo.put("message", ex.getMessage());
        cuerpo.put("path", request.getRequestURI());
        return ResponseEntity.badRequest().body(cuerpo);
    }
}
