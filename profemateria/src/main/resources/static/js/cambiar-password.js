/* ==========================================================================
 * cambiar-password.js — POST /api/auth/password
 * --------------------------------------------------------------------------
 * El backend guarda la contraseña cifrada con BCrypt y marca
 * users.password_changed = 1. A partir de ahí el usuario ya puede usar el
 * resto de endpoints (antes el filtro le devolvía
 * 403 PASSWORD_CHANGE_REQUIRED).
 * ======================================================================== */

$(document).ready(function () {

    Sesion.iniciar({ permitirCambioPassword: true }).done(function (usuario) {

        // El aviso sólo tiene sentido si aún no la había cambiado.
        $("#avisoPrimerLogin").toggleClass("d-none", usuario.passwordChanged);

        $("#formPassword").on("submit", function (e) {
            e.preventDefault();

            const nueva = $("#nuevaPassword").val();
            const repetida = $("#repetirPassword").val();

            if (nueva.length < 6) {
                mostrarMensaje("warning", "La contraseña debe tener al menos 6 caracteres.");
                return;
            }
            if (nueva !== repetida) {
                mostrarMensaje("danger", "Las dos contraseñas no coinciden.");
                return;
            }

            logPeticion("POST ▶", "/api/auth/password\n  body: " +
                serializar({ nuevaPassword: "••••••••" }));

            $.ajax({
                url: "/api/auth/password",
                method: "POST",
                contentType: "application/json; charset=UTF-8",
                data: serializar({ nuevaPassword: nueva }),
                dataType: "json",
                success: function (respuesta) {
                    logPeticion("POST ◀", "200 OK — " + serializar(respuesta));
                    mostrarMensaje("success", "Contraseña actualizada correctamente.");
                    $("#formPassword")[0].reset();
                    setTimeout(function () {
                        location.replace(Sesion.inicio(usuario));
                    }, 700);
                },
                error: function (jqXHR) {
                    logPeticion("POST ✖", mensajeError(jqXHR) + " — " +
                        mensajeRespuesta(jqXHR.responseText));
                    mostrarMensaje("danger", "No se pudo cambiar la contraseña: " +
                        mensajeError(jqXHR));
                }
            });
        });
    });
});
