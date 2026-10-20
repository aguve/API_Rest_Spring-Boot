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
 *
 * Las utilidades comunes (serializar, logPeticion, mostrarMensaje,
 * mensajeError, validarFormulario, escapar...) están en js/common.js.
 * ========================================================================== */

const API_URL = "/api/materias";

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

        const btnProfesor = $('<button class="btn btn-sm btn-outline-info me-1">')
            .html('<i class="bi bi-person-badge"></i> Profesor')
            .on("click", function () { verProfesorDeMateria(m.idMateria, m.nombre); });

        const btnEditar = $('<button class="btn btn-sm btn-outline-warning me-1">')
            .html('<i class="bi bi-pencil"></i> Editar')
            .on("click", function () { cargarEnFormulario(m); });

        const btnEliminar = $('<button class="btn btn-sm btn-outline-danger">')
            .html('<i class="bi bi-trash"></i> Eliminar')
            .on("click", function () { abrirModalEliminar(m); });

        celda.append(btnProfesor, btnEditar, btnEliminar);
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
            <div class="col-sm-2">Horas: <span class="badge bg-info text-dark">${m.horasCatedra}</span></div>
            <div class="col-sm-2">Profesor ID: <span class="badge bg-secondary">${m.idProfesor}</span></div>
            <div class="col-sm-2 text-end">
              <button class="btn btn-sm btn-outline-info" id="btnVerProfesorBusqueda">
                <i class="bi bi-person-badge"></i> Ver profesor
              </button>
            </div>
          </div>
        </div>
      </div>`;
    $("#resultadoBusqueda").html(html);
    $("#btnVerProfesorBusqueda").on("click", function () {
        verProfesorDeMateria(m.idMateria, m.nombre);
    });
}

/* ==========================================================================
 * 2b. PROFESOR DE UNA MATERIA — GET /api/materias/{id}/profesor
 * --------------------------------------------------------------------------
 * Petición:  GET, el id de la materia va en la RUTA (subrecurso "profesor").
 * Respuesta: 200 + objeto Profesor; si la materia no existe (o no tiene
 *            profesor) la API devuelve null => body vacío.
 * Se muestra el resultado en un modal de Bootstrap.
 * ========================================================================== */
function verProfesorDeMateria(idMateria, nombreMateria) {
    const url = `${API_URL}/${idMateria}/profesor`;
    logPeticion("GET ▶", url);

    // Abrimos el modal en estado "cargando"
    $("#tituloProfesorModal").text(`#${idMateria} — ${nombreMateria}`);
    $("#cuerpoProfesor").html(
        '<div class="text-center py-3">' +
        '<div class="spinner-border text-primary" role="status"></div>' +
        '<p class="text-muted small mt-2 mb-0">Consultando profesor...</p></div>'
    );
    new bootstrap.Modal("#modalProfesor").show();

    $.ajax({
        url: url,
        method: "GET",
        dataType: "json",
        success: function (data) {
            if (data === null) {
                logPeticion("GET ◀", `200 OK — sin contenido (materia ${idMateria} sin profesor)`);
                $("#cuerpoProfesor").html(
                    '<p class="text-muted mb-0">' +
                    'Esta materia no tiene profesor asignado.</p>'
                );
                return;
            }
            logPeticion("GET ◀", `200 OK:\n${serializar(data)}`);
            $("#cuerpoProfesor").html(`
              <ul class="list-group list-group-flush">
                <li class="list-group-item d-flex justify-content-between">
                  <span class="text-muted">ID</span>
                  <strong>${data.idProfesor}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  <span class="text-muted">Nombre</span>
                  <strong>${escapar(data.nombre)}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  <span class="text-muted">Apellidos</span>
                  <strong>${escapar(data.apellidos)}</strong>
                </li>
                <li class="list-group-item d-flex justify-content-between">
                  <span class="text-muted">Dirección</span>
                  <span>${data.direccion ? escapar(data.direccion) : '<span class="text-muted">—</span>'}</span>
                </li>
              </ul>`);
        },
        error: function (jqXHR) {
            logPeticion("GET ✖", mensajeError(jqXHR));
            $("#cuerpoProfesor").html(
                '<div class="alert alert-danger mb-0">' + mensajeError(jqXHR) + '</div>'
            );
            mostrarMensaje("danger", "Error al consultar el profesor: " + mensajeError(jqXHR));
        }
    });
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

/* ==========================================================================
 * Arranque: registro de eventos cuando el DOM está listo
 * ==========================================================================
 * Nota: se usa el shorthands de jQuery — cada handler dispara $.ajax.
 */
$(document).ready(function () {

    Sesion.iniciar({ roles: ["DIRECTOR", "PROFESOR"] }).done(function (usuario) {

    // Un profesor sólo puede crear/editar materias a su nombre: se oculta el
    // campo "ID Profesor" y se muestra un aviso.
    if (usuario.rol === "PROFESOR") {
        $("#idProfesor").closest(".mb-3").addClass("d-none");
        $("#idProfesor").prop("required", false);
        $("#avisoProfesor").removeClass("d-none");
    }

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
        if (!validarFormulario("#formMateria")) return;

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

    }); // fin Sesion.iniciar
});
