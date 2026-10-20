/* ==========================================================================
 * common.js — Utilidades AJAX compartidas por las páginas de Materias y
 *             Profesores.
 * --------------------------------------------------------------------------
 * Contiene los helpers comunes de la "capa de transporte":
 *
 *  · serializar()      → objeto JS  ->  texto JSON (body del request)
 *  · mensajeRespuesta()→ respuesta  ->  texto legible
 *  · logPeticion()     → escribe en la consola de peticiones de la página
 *  · mostrarMensaje()  → alerta Bootstrap (éxito / error / aviso)
 *  · mensajeError()    → mensaje estándar a partir de un jqXHR (error AJAX)
 *  · validarFormulario()→ Constraint Validation de HTML5
 *  · escapar()         → escapado HTML básico (anti-XSS)
 *
 * Este fichero se carga ANTES que app.js / profesores.js en cada página.
 * ========================================================================== */

/**
 * Serializa un objeto JS a texto JSON listo para viajar por el body HTTP.
 * Ej.: {nombre:"Álgebra", creditos:6}  ->  '{"nombre":"Álgebra","creditos":6}'
 */
function serializar(objeto) {
    return JSON.stringify(objeto);
}

/**
 * Convierte la respuesta (ya sea JSON o texto) en un mensaje legible.
 * Si jQuery no pudo parsear, `data` llega como string y se muestra tal cual.
 */
function mensajeRespuesta(data) {
    if (data === null || data === undefined || data === "") {
        return "(respuesta vacía)";
    }
    if (typeof data === "object") {
        // JSON.stringify con formato legible para la consola
        return JSON.stringify(data, null, 2);
    }
    return String(data);
}

/**
 * Escribe una entrada en la consola de peticiones de la página.
 * Documenta visualmente QUÉ viaja en cada petición/respuesta.
 */
function logPeticion(tipo, detalle) {
    const consola = $("#consolaAjax");
    if (consola.length === 0) {
        return; // la página no tiene consola
    }
    const hora = new Date().toLocaleTimeString();
    const entrada = `<span class="log-hora">[${hora}]</span> ` +
                    `<span class="log-tipo">${tipo}</span> ` +
                    detalle;
    consola.append(entrada + "\n");
    // scroll automático al final
    consola.scrollTop(consola[0].scrollHeight);
}

/**
 * Muestra una alerta de Bootstrap arriba de la página.
 * @param tipo  "success" | "danger" | "warning" | "info"
 * @param texto mensaje en formato texto plano (se escapa con .text())
 */
function mostrarMensaje(tipo, texto) {
    const alerta = $(
        `<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">`
    );
    alerta.append($("<span></span>").text(texto));       // XSS-safe
    alerta.append(
        '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>'
    );
    $("#zonaMensajes").append(alerta);
    setTimeout(() => alerta.alert("close"), 5000);
}

/**
 * Construye el mensaje de error estándar a partir del objeto jqXHR.
 * La API usa un @ExceptionHandler (ApiExceptionHandler) para 403/400 de
 * negocio, y el JSON por defecto de Spring Boot para el resto; en ambos
 * casos el cuerpo suele traer {status, error, message, path}.
 */
function mensajeError(jqXHR) {
    const r = jqXHR.responseJSON;
    if (r && r.error) {
        return `HTTP ${r.status} ${r.error} — ${r.path}`;
    }
    if (jqXHR.status === 0) {
        return "No se pudo contactar con la API (¿está levantada en el puerto 8080?).";
    }
    return `HTTP ${jqXHR.status} ${jqXHR.statusText}`;
}

/**
 * Valida un formulario con la API de Constraint Validation de HTML5
 * (el backend NO valida: cualquier cosa que llegue se guarda tal cual).
 * @param selector selector jQuery del <form> (p.ej. "#formMateria")
 */
function validarFormulario(selector) {
    const form = $(selector)[0];
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return false;
    }
    return true;
}

/** Escapado mínimo para pintar texto en HTML (evita XSS por nombres con < >). */
function escapar(texto) {
    return $("<div>").text(texto).html();
}

/* ==========================================================================
 * Manejo global de errores de sesión
 * --------------------------------------------------------------------------
 *  · 401 No autenticado              → login.html
 *  · 403 PASSWORD_CHANGE_REQUIRED    → cambiar-password.html
 *  (se evita el bucle dentro de esas dos páginas)
 * ========================================================================== */
$(document).ajaxError(function (event, jqXHR) {
    const pagina = location.pathname.split("/").pop() || "index.html";
    const codigo = jqXHR.responseJSON && jqXHR.responseJSON.code;

    if (jqXHR.status === 401 && pagina !== "login.html") {
        location.replace("login.html");
        return;
    }
    if (jqXHR.status === 403 && codigo === "PASSWORD_CHANGE_REQUIRED" &&
        pagina !== "cambiar-password.html") {
        location.replace("cambiar-password.html");
    }
});
