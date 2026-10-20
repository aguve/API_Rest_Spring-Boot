/* ==========================================================================
 * login.js — POST /api/auth/login
 * --------------------------------------------------------------------------
 * El backend valida contra la tabla "users" con BCrypt y devuelve una sesión
 * (cookie JSESSIONID). Después se comprueba si aún no ha cambiado la
 * contraseña (passwordChanged=false) para mandarle a cambiar-password.html.
 * ======================================================================== */

$(document).ready(function () {

    // Si ya hay sesión, no tiene sentido estar en la pantalla de acceso.
    $.ajax({
        url: "/api/auth/me",
        method: "GET",
        dataType: "json",
        success: function (usuario) {
            if (usuario.passwordChanged) {
                location.replace(usuario.rol === "ADMIN" ? "directores.html" : "index.html");
            } else {
                location.replace("cambiar-password.html");
            }
        },
        error: function () {
            // 401 = sin sesión: nos quedamos en el formulario.
        }
    });

    $("#formLogin").on("submit", function (e) {
        e.preventDefault();

        const datos = {
            username: $("#username").val().trim(),
            password: $("#password").val()
        };

        if (!datos.username) {
            mostrarMensaje("warning", "Indica tu ID de usuario.");
            return;
        }

        logPeticion("POST ▶", "/api/auth/login\n  body: " +
            serializar({ username: datos.username, password: "••••••••" }));

        $.ajax({
            url: "/api/auth/login",
            method: "POST",
            contentType: "application/json; charset=UTF-8",
            data: serializar(datos),
            dataType: "json",
            success: function (sesion) {
                logPeticion("POST ◀", "200 OK — sesión abierta:\n" + serializar(sesion));

                if (!sesion.passwordChanged) {
                    mostrarMensaje("warning",
                        "Debes cambiar tu contraseña para continuar.");
                    setTimeout(function () {
                        location.replace("cambiar-password.html");
                    }, 600);
                    return;
                }

                mostrarMensaje("success",
                    `Bienvenido/a ${sesion.rol} (ID ${sesion.userId}).`);
                setTimeout(function () {
                    location.replace(sesion.rol === "ADMIN" ? "directores.html" : "index.html");
                }, 400);
            },
            error: function (jqXHR) {
                logPeticion("POST ✖", mensajeError(jqXHR) + " — " +
                    mensajeRespuesta(jqXHR.responseText));
                mostrarMensaje("danger", "Usuario o contraseña incorrectos.");
            }
        });
    });
});
