/* ==========================================================================
 * profesores.js — Frontend AJAX para la API REST de Profesores
 * --------------------------------------------------------------------------
 * Espejo de app.js (Materias) pero con el recurso "profesor".
 * Usa las utilidades compartidas de js/common.js: serializar(),
 * mensajeRespuesta(), logPeticion(), mostrarMensaje(), mensajeError(),
 * validarFormulario() y escapar().
 *
 * Endpoints consumidos (todos bajo /api):
 *   GET     /api/profesor        -> List<Profesor>       (JSON array)
 *   GET     /api/profesor/{id}   -> Profesor | vacío     (JSON)
 *   POST    /api/profesor        -> Profesor creado      (JSON)
 *   PUT     /api/profesor        -> Profesor actualizado (JSON)
 *   DELETE  /api/profesor/{id}   -> texto plano: "Profesor eliminado - id N"
 *
 * REGLAS DE TRANSMISIÓN (igual que en materias):
 *   · salida  -> JSON.stringify(obj) en el body con
 *                Content-Type: application/json; charset=UTF-8
 *   · entrada -> dataType:"json" (JSON.parse automático), salvo DELETE que es
 *                dataType:"text" porque responde texto plano
 * ========================================================================== */

const API_URL = "/api/profesor";

/* ==========================================================================
 * 1. LEER — GET /api/profesor
 * --------------------------------------------------------------------------
 * Request:  GET sin body. Response: 200 + array JSON.
 * ========================================================================== */
function listarProfesores() {
    logPeticion("GET ▶", API_URL);

    $.ajax({
        url: API_URL,
        method: "GET",
        dataType: "json",
        success: function (data) {
            renderizarTabla(data);
            logPeticion("GET ◀", `200 OK — ${data.length} registro(s):\n` +
                                 serializar(data));
            $("#pieTabla").text(
                `Última carga: ${data.length} profesor(es) recibido(s) a las ` +
                `${new Date().toLocaleTimeString()}`
            );
        },
        error: function (jqXHR) {
            logPeticion("GET ✖", mensajeError(jqXHR));
            mostrarMensaje("danger", "Error al listar profesores: " + mensajeError(jqXHR));
        }
    });
}

/**
 * Pinta el array de profesores en el <tbody> de la tabla.
 * Cada fila conserva el idProfesor para poder editar/eliminar.
 */
function renderizarTabla(profesores) {
    const tbody = $("#tablaProfesores");
    tbody.empty();

    if (!profesores || profesores.length === 0) {
        tbody.append(
            '<tr><td colspan="5" class="text-center text-muted py-4">' +
            'No hay profesores registrados.</td></tr>'
        );
        return;
    }

    profesores.forEach(function (p) {
        const fila = $("<tr>");
        fila.append($("<td>").text(p.idProfesor));
        fila.append($("<td>").text(p.nombre));
        fila.append($("<td>").text(p.apellidos));
        fila.append($("<td>").text(p.direccion || "—"));

        const celda = $("<td>").addClass("text-end");

        const btnMaterias = $('<button class="btn btn-sm btn-outline-info me-1">')
            .html('<i class="bi bi-journal-bookmark"></i> Materias')
            .on("click", function () { verMateriasDeProfesor(p); });

        const btnEditar = $('<button class="btn btn-sm btn-outline-warning me-1">')
            .html('<i class="bi bi-pencil"></i> Editar')
            .on("click", function () { cargarEnFormulario(p); });

        const btnEliminar = $('<button class="btn btn-sm btn-outline-danger">')
            .html('<i class="bi bi-trash"></i> Eliminar')
            .on("click", function () { abrirModalEliminar(p); });

        celda.append(btnMaterias, btnEditar, btnEliminar);
        fila.append(celda);
        tbody.append(fila);
    });
}

/* ==========================================================================
 * 2. LEER UNO — GET /api/profesor/{id}
 * --------------------------------------------------------------------------
 * El id viaja en la RUTA (path variable), no en el body.
 * Si no existe, el backend devuelve null => respuesta 200 con body vacío.
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
            if (data === null) {
                logPeticion("GET ◀", `200 OK — sin contenido (ID ${id} no existe)`);
                mostrarMensaje("warning", `No existe ningún profesor con ID ${id}.`);
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

function pintarResultadoBusqueda(p) {
    const html = `
      <div class="card border-success">
        <div class="card-body py-2">
          <div class="row align-items-center">
            <div class="col-sm-4"><strong>#${p.idProfesor} ${escapar(p.nombre)} ${escapar(p.apellidos)}</strong></div>
            <div class="col-sm-5">${p.direccion ? escapar(p.direccion) : '<span class="text-muted">Sin dirección</span>'}</div>
            <div class="col-sm-3 text-end">
              <button class="btn btn-sm btn-outline-info" id="btnVerMateriasBusqueda">
                <i class="bi bi-journal-bookmark"></i> Ver materias
              </button>
            </div>
          </div>
        </div>
      </div>`;
    $("#resultadoBusqueda").html(html);
    $("#btnVerMateriasBusqueda").on("click", function () { verMateriasDeProfesor(p); });
}

/* ==========================================================================
 * 2b. MATERIAS DE UN PROFESOR — GET /api/profesor/{id}/materias
 * --------------------------------------------------------------------------
 * Petición:  GET, el id del profesor va en la RUTA (subrecurso "materias").
 * Respuesta: 200 + array JSON de materias (cada una con sus datos). Si el
 *            profesor no tiene materias, la API devuelve un array vacío [].
 * Se muestra el listado en un modal de Bootstrap.
 * ========================================================================== */
function verMateriasDeProfesor(p) {
    const url = `${API_URL}/${p.idProfesor}/materias`;
    logPeticion("GET ▶", url);

    $("#tituloMateriasModal").text(`#${p.idProfesor} — ${p.nombre} ${p.apellidos}`);
    $("#cuerpoMaterias").html(
        '<div class="text-center py-3">' +
        '<div class="spinner-border text-primary" role="status"></div>' +
        '<p class="text-muted small mt-2 mb-0">Consultando materias...</p></div>'
    );
    new bootstrap.Modal("#modalMaterias").show();

    $.ajax({
        url: url,
        method: "GET",
        dataType: "json",
        success: function (data) {
            logPeticion("GET ◀", `200 OK:\n${serializar(data)}`);

            if (!data || data.length === 0) {
                $("#cuerpoMaterias").html(
                    '<p class="text-muted mb-0">' +
                    'Este profesor no imparte ninguna materia.</p>'
                );
                return;
            }

            let filas = "";
            data.forEach(function (m) {
                filas += `<tr>
                    <td>${m.idMateria}</td>
                    <td>${escapar(m.nombre)}</td>
                    <td class="text-center"><span class="badge bg-primary">${m.creditos}</span></td>
                    <td class="text-center"><span class="badge bg-info text-dark">${m.horasCatedra}</span></td>
                  </tr>`;
            });

            $("#cuerpoMaterias").html(`
              <div class="table-responsive">
                <table class="table table-sm table-striped align-middle mb-0">
                  <thead class="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Materia</th>
                      <th class="text-center">Créditos</th>
                      <th class="text-center">Horas</th>
                    </tr>
                  </thead>
                  <tbody>${filas}</tbody>
                </table>
              </div>
              <p class="text-muted small mt-2 mb-0">
                Total: <strong>${data.length}</strong> materia(s).
              </p>`);
        },
        error: function (jqXHR) {
            logPeticion("GET ✖", mensajeError(jqXHR));
            $("#cuerpoMaterias").html(
                '<div class="alert alert-danger mb-0">' + mensajeError(jqXHR) + '</div>'
            );
            mostrarMensaje("danger", "Error al consultar las materias: " + mensajeError(jqXHR));
        }
    });
}

/* ==========================================================================
 * 3. CREAR — POST /api/profesor
 * --------------------------------------------------------------------------
 * JS object → JSON.stringify → body con Content-Type: application/json
 * → @RequestBody + Jackson → Profesor con idProfesor = 0.
 * Respuesta: 200 + objeto creado (con idProfesor asignado por la BD).
 * ========================================================================== */
function crearProfesor(datos) {
    logPeticion("POST ▶", `${API_URL}\n  body: ${serializar(datos)}`);

    $.ajax({
        url: API_URL,
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        data: serializar(datos),
        dataType: "json",
        success: function (data) {
            logPeticion("POST ◀", `200 OK — creado con id ${data.idProfesor}:\n` +
                                  serializar(data));
            mostrarMensaje("success",
                `Profesor "${data.nombre} ${data.apellidos}" creado (ID ${data.idProfesor}).`);
            listarProfesores();
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
 * 4. ACTUALIZAR — PUT /api/profesor
 * --------------------------------------------------------------------------
 * Mismo body que POST pero INCLUYE idProfesor para indicar qué fila cambiar
 * (el identificador viaja DENTRO del JSON, no en la URL).
 * ========================================================================== */
function actualizarProfesor(datos) {
    logPeticion("PUT ▶", `${API_URL}\n  body: ${serializar(datos)}`);

    $.ajax({
        url: API_URL,
        method: "PUT",
        contentType: "application/json; charset=UTF-8",
        data: serializar(datos),
        dataType: "json",
        success: function (data) {
            logPeticion("PUT ◀", `200 OK — actualizado:\n${serializar(data)}`);
            mostrarMensaje("success",
                `Profesor "${data.nombre} ${data.apellidos}" actualizado.`);
            listarProfesores();
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
 * 5. ELIMINAR — DELETE /api/profesor/{id}
 * --------------------------------------------------------------------------
 * El id va en la RUTA y no hay body. La respuesta NO es JSON sino texto
 * plano ("Profesor eliminado - id N"), por eso dataType: "text".
 *
 * ATENCIÓN: si el profesor tiene materias apuntándole (FK id_profesor), MySQL
 * rechaza el borrado y la API responde HTTP 500.
 * ========================================================================== */
function eliminarProfesor(id) {
    const url = `${API_URL}/${id}`;
    logPeticion("DELETE ▶", url);

    $.ajax({
        url: url,
        method: "DELETE",
        dataType: "text",
        success: function (data) {
            logPeticion("DELETE ◀", `200 OK — ${data}`);
            mostrarMensaje("success", data);
            listarProfesores();
        },
        error: function (jqXHR) {
            logPeticion("DELETE ✖", `${mensajeError(jqXHR)}\n  respuesta: ` +
                                  mensajeRespuesta(jqXHR.responseText));
            mostrarMensaje("danger",
                "No se pudo eliminar (probablemente tiene materias asignadas): " +
                mensajeError(jqXHR));
        }
    });
}

/* ==========================================================================
 * Formulario (crear vs. editar) y utilidades de UI
 * ========================================================================== */

/**
 * Construye el objeto JS que se serializará a JSON.
 * Los nombres deben ser EXACTOS (camelCase) para que Jackson los reconozca:
 * idProfesor, nombre, apellidos, direccion.
 */
function obtenerDatosDelFormulario() {
    return {
        idProfesor: parseInt($("#idProfesor").val() || "0", 10),
        nombre: $("#nombre").val().trim(),
        apellidos: $("#apellidos").val().trim(),
        // direccion es nullable: vacío -> "" (Jackson lo vuelve String)
        direccion: $("#direccion").val().trim()
    };
}

/** Rellena el formulario con los datos de una fila (modo edición). */
function cargarEnFormulario(p) {
    $("#idProfesor").val(p.idProfesor);
    $("#nombre").val(p.nombre);
    $("#apellidos").val(p.apellidos);
    $("#direccion").val(p.direccion);

    $("#tituloFormulario").html(
        '<i class="bi bi-person-square"></i> Editar profesor #' + p.idProfesor +
        ' <span class="text-muted small ms-2">PUT /api/profesor</span>'
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
    $("#formProfesor")[0].reset();
    $("#formProfesor").removeClass("was-validated");
    $("#idProfesor").val("");

    $("#tituloFormulario").html(
        '<i class="bi bi-person-plus"></i> Nuevo profesor ' +
        '<span class="text-muted small ms-2">POST /api/profesor</span>'
    );
    $("#btnGuardar")
        .html('<i class="bi bi-save"></i> Guardar (POST)')
        .removeClass("btn-warning").addClass("btn-success");
    $("#btnCancelarEdicion").prop("hidden", true);
}

/* --- Modal de eliminación ------------------------------------------------ */
let idAEliminar = null;

function abrirModalEliminar(p) {
    idAEliminar = p.idProfesor;
    $("#nombreProfesorAEliminar").text(`#${p.idProfesor} — ${p.nombre} ${p.apellidos}`);
    $("#rutaDelete").text(`DELETE /api/profesor/${p.idProfesor}`);
    new bootstrap.Modal("#modalEliminar").show();
}

/* ==========================================================================
 * Arranque: registro de eventos cuando el DOM está listo
 * ========================================================================== */
$(document).ready(function () {

    listarProfesores(); // carga inicial (GET /api/profesor)

    // GET /api/profesor/{id}
    $("#btnBuscar").on("click", buscarPorId);
    $("#inputBuscarId").on("keypress", function (e) {
        if (e.which === 13) buscarPorId(); // Enter
    });
    $("#btnLimpiarBusqueda").on("click", function () {
        $("#inputBuscarId").val("");
        $("#resultadoBusqueda").empty();
    });

    // POST o PUT, decidido por si hay idProfesor en el formulario
    $("#formProfesor").on("submit", function (e) {
        e.preventDefault();               // evita el submit tradicional (recarga)
        if (!validarFormulario("#formProfesor")) return;

        const datos = obtenerDatosDelFormulario();

        if (datos.idProfesor > 0) {
            actualizarProfesor(datos);     // PUT  /api/profesor
        } else {
            delete datos.idProfesor;       // POST: sin id, la BD lo asigna
            crearProfesor(datos);          // POST /api/profesor
        }
    });

    $("#btnCancelarEdicion").on("click", limpiarFormulario);

    // DELETE /api/profesor/{id} (confirmado en modal)
    $("#btnConfirmarEliminar").on("click", function () {
        if (idAEliminar !== null) {
            eliminarProfesor(idAEliminar);
            idAEliminar = null;
        }
        bootstrap.Modal.getInstance("#modalEliminar").hide();
    });

    // Recarga del listado
    $("#btnRecargar").on("click", listarProfesores);

    // Consola
    $("#btnLimpiarConsola").on("click", function () {
        $("#consolaAjax").empty();
    });
});
