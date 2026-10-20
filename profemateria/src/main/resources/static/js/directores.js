/* ==========================================================================
 * directores.js — Área del administrador (alta de directores)
 * --------------------------------------------------------------------------
 * Endpoints:
 *   GET  /api/admin/directores  -> lista de usuarios ROLE_DIRECTOR
 *   POST /api/admin/directores  -> {nombre, apellidos, direccion}
 * ======================================================================== */

const API_URL = "/api/admin/directores";

function listarDirectores() {
    logPeticion("GET ▶", API_URL);

    $.ajax({
        url: API_URL,
        method: "GET",
        dataType: "json",
        success: function (data) {
            renderizarTabla(data);
            logPeticion("GET ◀", `200 OK — ${data.length} registro(s):\n` + serializar(data));
            $("#pieTabla").text(
                `Última carga: ${data.length} director(es) a las ` +
                `${new Date().toLocaleTimeString()}`
            );
        },
        error: function (jqXHR) {
            logPeticion("GET ✖", mensajeError(jqXHR));
            mostrarMensaje("danger", "Error al listar directores: " + mensajeError(jqXHR));
        }
    });
}

function renderizarTabla(directores) {
    const tbody = $("#tablaDirectores");
    tbody.empty();

    if (!directores || directores.length === 0) {
        tbody.append(
            '<tr><td colspan="5" class="text-center text-muted py-4">' +
            'Todavía no hay directores dados de alta.</td></tr>'
        );
        return;
    }

    directores.forEach(function (d) {
        const fila = $("<tr>");
        fila.append($("<td>").text(d.userId));
        fila.append($("<td>").text(d.nombre || "—"));
        fila.append($("<td>").text(d.apellidos || "—"));
        fila.append($("<td>").text(d.direccion || "—"));

        const badge = d.passwordChanged
            ? '<span class="badge bg-success">Sí</span>'
            : '<span class="badge bg-warning text-dark">Por defecto</span>';
        fila.append($("<td>").addClass("text-center").html(badge));

        tbody.append(fila);
    });
}

function limpiarFormulario() {
    $("#formDirector")[0].reset();
    $("#formDirector").removeClass("was-validated");
}

/* ==========================================================================
 * Formulario de alta de director
 * ======================================================================== */
function nuevoDirector(datos) {
    logPeticion("POST ▶", `${API_URL}\n  body: ${serializar(datos)}`);

    $.ajax({
        url: API_URL,
        method: "POST",
        contentType: "application/json; charset=UTF-8",
        data: serializar(datos),
        dataType: "json",
        success: function (data) {
            logPeticion("POST ◀", `200 OK:\n${serializar(data)}`);
            mostrarMensaje("success",
                `Director "${data.profesor.nombre} ${data.profesor.apellidos}" creado (ID ${data.userId}).`);

            $("#directorCreado").text(
                `${data.profesor.nombre} ${data.profesor.apellidos}`);
            $("#directorCreadoUsuario").text(
                `${data.profesor.nombre} ${data.profesor.apellidos}`);
            $("#passwordUserId").text(data.userId);
            $("#passwordPorDefecto").text(data.passwordPorDefecto);
            new bootstrap.Modal("#modalPassword").show();

            listarDirectores();
            limpiarFormulario();
        },
        error: function (jqXHR) {
            logPeticion("POST ✖", `${mensajeError(jqXHR)}\n  respuesta: ` +
                mensajeRespuesta(jqXHR.responseText));
            mostrarMensaje("danger", "Error al crear el director: " + mensajeError(jqXHR));
        }
    });
}

/* ==========================================================================
 * Arranque de la página de directores
 * ======================================================================== */
$(document).ready(function () {
    Sesion.iniciar({ roles: ["ADMIN"] }).done(function () {

        listarDirectores();

        $("#formDirector").on("submit", function (e) {
            e.preventDefault();
            if (!validarFormulario("#formDirector")) return;

            nuevoDirector({
                nombre: $("#nombre").val().trim(),
                apellidos: $("#apellidos").val().trim(),
                direccion: $("#direccion").val().trim()
            });
        });

        $("#btnRecargar").on("click", listarDirectores);
        $("#btnLimpiarConsola").on("click", function () {
            $("#consolaAjax").empty();
        });
    });
});
