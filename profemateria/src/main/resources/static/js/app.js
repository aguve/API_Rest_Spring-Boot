/* ==========================================================================
 * app.js — Frontend AJAX para la API REST de Materias
 * --------------------------------------------------------------------------
 * Toda la comunicación con el backend se hace con $.ajax (jQuery).
 *
 * REGLAS DE TRANSMISIÓN DE DATOS que sigue este archivo:
 *
 *  1. SALIDA (request): el objeto JS se serializa con JSON.stringify() y se
 *     envía en el BODY (no en la URL) con cabecera
 *     Content-Type: application/json; charset=UTF-8.
 *     Por eso processData:false (jQuery no debe form-encoded el body)
 *     y contentType:false NO se usa: aquí SÍ fijamos el content-type manualmente.
 *
 *  2. ENTRADA (response): la API devuelve JSON (excepto DELETE, que devuelve
 *     texto plano). Se declara dataType para que jQuery haga la conversión
 *     automática (JSON.parse) y la variable `data` ya sea un objeto JS.
 *
 *  3. La URL base es RELATIVA ("/api/materias") porque el HTML lo sirve el
 *     MISMO servidor Spring Boot => mismo origen => sin problemas CORS.
 * ========================================================================== */

const API_URL = "/api/materias";

/* ==========================================================================
 * utilidades de transmisión
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
 * La API NO tiene @ExceptionHandler: los errores llegan con el JSON por
 * defecto de Spring Boot: {timestamp, status, error, path}
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

/* ==========================================================================
 * 1. LEER — GET /api/materias
 * --------------------------------------------------------------------------
 * Petición:  GET, sin body, sin Content-Type relevante.
 * Respuesta: 200 + array JSON de materias.
 * ========================================================================== */
function listarMaterias() {
    logPeticion("GET ▶", API_URL);

    $.ajax({
        url: API_URL,
        method: "GET",           // verbo HTTP
        dataType: "json",        // esperamos JSON => jQuery hace JSON.parse()
        success: function (data) {
            renderizarTabla(data);
            logPeticion("GET ◀", `200 OK — ${data.length} registro(s):\n` +
                                 serializar(data));
            $("#pieTabla").text(
                `Última carga: ${data.length} materia(s) recibida(s) a las ` +
                `${new Date().toLocaleTimeString()}`
            );
        },
        error: function (jqXHR) {
            logPeticion("GET ✖", `${mensajeError(jqXHR)}`);
            mostrarMensaje("danger", "Error al listar materias: " + mensajeError(jqXHR));
        }
    });
}

/**
 * Pinta el array de materias en el <tbody> de la tabla.
 * Cada fila usa data-* para conservar el idMateria y poder editar/eliminar.
 */
function renderizarTabla(materias) {
    const tbody = $("#tablaMaterias");
    tbody.empty();

    if (!materias || materias.length === 0) {
        tbody.append(
            '<tr><td colspan="6" class="text-center text-muted py-4">' +
            'No hay materias registradas.</td></tr>'
        );
        return;
    }

    materias.forEach(function (m) {
        const fila = $("<tr>");
        fila.append($("<td>").text(m.idMateria));
        fila.append($("<td>").text(m.nombre));
        fila.append($("<td>").addClass("text-center").text(m.creditos));
        fila.append($("<td>").addClass("text-center").text(m.horasCatedra));
        fila.append($("<td>").addClass("text-center").text(m.idProfesor));

        // Celda de acciones
        const celda = $("<td>").addClass("text-end");

        const btnEditar = $('<button class="btn btn-sm btn-outline-warning me-1">')
            .html('<i class="bi bi-pencil"></i> Editar')
            .on("click", function () { cargarEnFormulario(m); });

        const btnEliminar = $('<button class="btn btn-sm btn-outline-danger">')
            .html('<i class="bi bi-trash"></i> Eliminar')
            .on("click", function () { abrirModalEliminar(m); });

        celda.append(btnEditar, btnEliminar);
        fila.append(celda);
        tbody.append(fila);
    });
}

/* ==========================================================================
 * 2. LEER UNO — GET /api/materias/{id}
 * --------------------------------------------------------------------------
 * El id viaja en la RUTA (path variable), no en el body.
 * Respuesta: 200 + objeto JSON, o 200 con body vacío si no existe
 * (la API devuelve null y Spring responde sin contenido).
 * ========================================================================== */
function buscarPorId() {
    const id = $("#inputBuscarId").val();

    if (!id || id <= 0) {
        mostrarMensaje("warning", "Introduce un ID válido.");
        return;
    }

    const url = `${API_URL}/${id}`;
    logPeticion("GET ▶", url);

    $.ajax({
        url: url,
        method: "GET",
        dataType: "json",
        success: function (data) {
            // Spring serializa null como body vacío; jQuery lo entrega como null
            if (data === null) {
                logPeticion("GET ◀", `200 OK — sin contenido (ID ${id} no existe)`);
                mostrarMensaje("warning", `No existe ninguna materia con ID ${id}.`);
                $("#resultadoBusqueda").empty();
                return;
            }
            logPeticion("GET ◀", `200 OK:\n${serializar(data)}`);
            pintarResultadoBusqueda(data);
        },
        error: function (jqXHR) {
            logPeticion("GET ✖", mensajeError(jqXHR));
            mostrarMensaje("danger", "Error en la búsqueda: " + mensajeError(jqXHR));
        }
    });
}

function pintarResultadoBusqueda(m) {
    const html = `
      <div class="card border-success">
        <div class="card-body py-2">
          <div class="row align-items-center">
            <div class="col-sm-3"><strong>#${m.idMateria} ${escapar(m.nombre)}</strong></div>
            <div class="col-sm-3">Créditos: <span class="badge bg-primary">${m.creditos}</span></div>
            <div class="col-sm-3">Horas: <span class="badge bg-info text-dark">${m.horasCatedra}</span></div>
            <div class="col-sm-3">Profesor ID: <span class="badge bg-secondary">${m.idProfesor}</span></div>
          </div>
        </div>
      </div>`;
    $("#resultadoBusqueda").html(html);
}

/* ==========================================================================
 * 3. CREAR — POST /api/materias
 * --------------------------------------------------------------------------
 * Transmisión:
 *   JS object  --JSON.stringify()-->  string JSON
 *   string     --Content-Type: application/json-->  body HTTP
 *   Spring     --@RequestBody + Jackson-->  objeto Materia (idMateria=0)
 *   Respuesta: 200 + objeto creado (con idMateria que asignó la BD).
 * ========================================================================== */
function crearMateria(datos) {
    logPeticion("POST ▶", `${API_URL}\n  body: ${serializar(datos)}`);

    $.ajax({
        url: API_URL,
        method: "POST",
        contentType: "application/json; charset=UTF-8", // cabecera clave
        data: serializar(datos),                       // body = JSON
        dataType: "json",                              // respuesta esperada
        success: function (data) {
            logPeticion("POST ◀", `200 OK — creada con id ${data.idMateria}:\n` +
                                  serializar(data));
            mostrarMensaje("success",
                `Materia "${data.nombre}" creada correctamente (ID ${data.idMateria}).`);
            listarMaterias();
            limpiarFormulario();
        },
        error: function (jqXHR) {
            logPeticion("POST ✖", `${mensajeError(jqXHR)}\n  respuesta: ` +
                                  mensajeRespuesta(jqXHR.responseText));
            mostrarMensaje("danger", "Error al crear: " + mensajeError(jqXHR));
        }
    });
}

/* ==========================================================================
 * 4. ACTUALIZAR — PUT /api/materias
 * --------------------------------------------------------------------------
 * Mismo formato de body que POST, pero INCLUYE idMateria para que la API
 * sepa qué fila actualizar (el id viaja DENTRO del JSON, no en la URL).
 * Respuesta: 200 + objeto actualizado (o fila "nueva" si el id no existía:
 * el DAO usa merge(), que hace upsert).
 * ========================================================================== */
function actualizarMateria(datos) {
    logPeticion("PUT ▶", `${API_URL}\n  body: ${serializar(datos)}`);

    $.ajax({
        url: API_URL,
        method: "PUT",
        contentType: "application/json; charset=UTF-8",
        data: serializar(datos),
        dataType: "json",
        success: function (data) {
            logPeticion("PUT ◀", `200 OK — actualizada:\n${serializar(data)}`);
            mostrarMensaje("success",
                `Materia "${data.nombre}" actualizada correctamente.`);
            listarMaterias();
            limpiarFormulario();
        },
        error: function (jqXHR) {
            logPeticion("PUT ✖", `${mensajeError(jqXHR)}\n  respuesta: ` +
                                  mensajeRespuesta(jqXHR.responseText));
            mostrarMensaje("danger", "Error al actualizar: " + mensajeError(jqXHR));
        }
    });
}

/* ==========================================================================
 * 5. ELIMINAR — DELETE /api/materias/{id}
 * --------------------------------------------------------------------------
 * El id viaja en la RUTA. No hay body.
 * ATENCIÓN: la respuesta NO es JSON sino texto plano (text/plain):
 *   "Materia eliminada - id: 3"
 * Por eso dataType: "text" y no "json".
 * ========================================================================== */
function eliminarMateria(id) {
    const url = `${API_URL}/${id}`;
    logPeticion("DELETE ▶", url);

    $.ajax({
        url: url,
        method: "DELETE",
        dataType: "text",   // la API responde texto plano, no JSON
        success: function (data) {
            logPeticion("DELETE ◀", `200 OK — ${data}`);
            mostrarMensaje("success", data); // el texto lo escribió el backend
            listarMaterias();
        },
        error: function (jqXHR) {
            logPeticion("DELETE ✖", mensajeError(jqXHR));
            mostrarMensaje("danger", "Error al eliminar: " + mensajeError(jqXHR));
        }
    });
}

/* ==========================================================================
 * Formulario (crear vs. editar) y utilidades de UI
 * ========================================================================== */

/**
 * Valida el formulario con la API de Constraint Validation de HTML5
 * (el backend NO valida: cualquier cosa que llegue se guarda tal cual).
 */
function validarFormulario() {
    const form = $("#formMateria")[0];
    if (!form.checkValidity()) {
        form.classList.add("was-validated");
        return false;
    }
    return true;
}

/**
 * Construye el objeto JS que se serializará a JSON.
 * OJO: los nombres de propiedades deben ser EXACTAMENTE los del backend:
 * idMateria, nombre, creditos, horasCatedra, idProfesor (camelCase).
 * Si se envía "horas_catedra" o "id_profesor", Jackson no lo reconoce y
 * el campo llega en 0 (o null) al servidor.
 */
function obtenerDatosDelFormulario() {
    return {
        idMateria: parseInt($("#idMateria").val() || "0", 10),
        nombre: $("#nombre").val().trim(),
        creditos: parseInt($("#creditos").val(), 10),
        horasCatedra: parseInt($("#horasCatedra").val(), 10),
        idProfesor: parseInt($("#idProfesor").val(), 10)
    };
}

/** Rellena el formulario con los datos de una fila (modo edición). */
function cargarEnFormulario(m) {
    $("#idMateria").val(m.idMateria);
    $("#nombre").val(m.nombre);
    $("#creditos").val(m.creditos);
    $("#horasCatedra").val(m.horasCatedra);
    $("#idProfesor").val(m.idProfesor);

    $("#tituloFormulario").html(
        '<i class="bi bi-pencil-square"></i> Editar materia #' + m.idMateria +
        ' <span class="text-muted small ms-2">PUT /api/materias</span>'
    );
    $("#btnGuardar")
        .html('<i class="bi bi-arrow-repeat"></i> Actualizar (PUT)')
        .removeClass("btn-success").addClass("btn-warning");
    $("#btnCancelarEdicion").prop("hidden", false);

    $("#nombre").focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

/** Vuelve el formulario a modo creación. */
function limpiarFormulario() {
    $("#formMateria")[0].reset();
    $("#formMateria").removeClass("was-validated");
    $("#idMateria").val("");

    $("#tituloFormulario").html(
        '<i class="bi bi-plus-square"></i> Nueva materia ' +
        '<span class="text-muted small ms-2">POST /api/materias</span>'
    );
    $("#btnGuardar")
        .html('<i class="bi bi-save"></i> Guardar (POST)')
        .removeClass("btn-warning").addClass("btn-success");
    $("#btnCancelarEdicion").prop("hidden", true);
}

/* --- Modal de eliminación ------------------------------------------------ */
let idAEliminar = null;

function abrirModalEliminar(m) {
    idAEliminar = m.idMateria;
    $("#nombreMateriaAEliminar").text(`#${m.idMateria} — ${m.nombre}`);
    $("#rutaDelete").text(`DELETE /api/materias/${m.idMateria}`);
    new bootstrap.Modal("#modalEliminar").show();
}

/** Escapado mínimo para pintar texto en HTML (evita XSS por nombres con < >). */
function escapar(texto) {
    return $("<div>").text(texto).html();
}

/* ==========================================================================
 * Arranque: registro de eventos cuando el DOM está listo
 * ==========================================================================
 * Nota: se usa el shorthands de jQuery — cada handler dispara $.ajax.
 */
$(document).ready(function () {

    listarMaterias(); // carga inicial (GET /api/materias)

    // GET /api/materias/{id}
    $("#btnBuscar").on("click", buscarPorId);
    $("#inputBuscarId").on("keypress", function (e) {
        if (e.which === 13) buscarPorId(); // Enter
    });
    $("#btnLimpiarBusqueda").on("click", function () {
        $("#inputBuscarId").val("");
        $("#resultadoBusqueda").empty();
    });

    // POST o PUT, decidido por si hay idMateria en el formulario
    $("#formMateria").on("submit", function (e) {
        e.preventDefault();               // evita el submit tradicional (recarga)
        if (!validarFormulario()) return;

        const datos = obtenerDatosDelFormulario();

        if (datos.idMateria > 0) {
            actualizarMateria(datos);      // PUT  /api/materias
        } else {
            delete datos.idMateria;        // POST: sin id, la BD lo asigna
            crearMateria(datos);           // POST /api/materias
        }
    });

    $("#btnCancelarEdicion").on("click", limpiarFormulario);

    // DELETE /api/materias/{id} (confirmado en modal)
    $("#btnConfirmarEliminar").on("click", function () {
        if (idAEliminar !== null) {
            eliminarMateria(idAEliminar);
            idAEliminar = null;
        }
        bootstrap.Modal.getInstance("#modalEliminar").hide();
    });

    // Recarga del listado
    $("#btnRecargar").on("click", listarMaterias);

    // Consola
    $("#btnLimpiarConsola").on("click", function () {
        $("#consolaAjax").empty();
    });
});
