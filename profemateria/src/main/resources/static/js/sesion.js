/* ==========================================================================
 * sesion.js — Control de sesión y permisos del frontend
 * --------------------------------------------------------------------------
 * Trabajan juntos con:
 *   · GET  /api/auth/me       → datos del usuario autenticado
 *   · POST /api/auth/login    → abrir sesión (js/login.js)
 *   · POST /api/auth/password → cambiar contraseña (js/cambiar-password.js)
 *   · POST /api/auth/logout   → cerrar sesión
 *
 * FLUJO que obliga el backend (users.password_changed):
 *   1. Sin sesión                  → login.html
 *   2. Sesión con passwordChanged  → cambiar-password.html
 *   3. Todo lo demás               → sólo si el rol permite la página
 *
 * USO en cada página protegida:
 *      Sesion.iniciar({ roles: ["DIRECTOR"] }).done(function (usuario) { ... });
 * ======================================================================== */

const Sesion = {
    usuario: null,
    _listo: $.Deferred(),

    /* ---------- utilidades de navegación ---------- */

    paginaActual: function () {
        const path = location.pathname.split("/").pop();
        return path === "" ? "index.html" : path;
    },

    /** Página de inicio según el rol. */
    inicio: function (usuario) {
        return usuario && usuario.rol === "ADMIN" ? "directores.html" : "index.html";
    },

    /* ---------- guardia de la página ---------- */

    /**
     * Comprueba la sesión y sólo resuelve el Deferred si el usuario puede
     * quedarse en la página. En caso contrario redirige.
     *
     * @param config {roles:[...], permitirCambioPassword:bool}
     * @returns jQuery.Deferred resuelto con el objeto usuario
     */
    iniciar: function (config) {
        config = config || {};
        const pagina = this.paginaActual();

        $.ajax({
            url: "/api/auth/me",
            method: "GET",
            dataType: "json",
            success: function (usuario) {
                Sesion.usuario = usuario;

                // La pantalla de cambio de contraseña se permite tanto en el
                // primer acceso como si el usuario quiere cambiarla después.
                if (config.permitirCambioPassword) {
                    Sesion.pintarBarra(usuario);
                    Sesion._listo.resolve(usuario);
                    return;
                }

                if (!usuario.passwordChanged) {
                    location.replace("cambiar-password.html");
                    return;
                }

                if (config.roles && config.roles.indexOf(usuario.rol) === -1) {
                    location.replace(Sesion.inicio(usuario));
                    return;
                }

                Sesion.pintarBarra(usuario);
                Sesion._listo.resolve(usuario);
            },
            error: function (jqXHR) {
                if (jqXHR.status === 401) {
                    location.replace("login.html");
                    return;
                }
                // Otros errores de red: se rechaza para que la página no
                // arranque con la petición de listado.
                Sesion._listo.reject(jqXHR);
            }
        });

        return this._listo;
    },

    /* ---------- barra de navegación ---------- */

    pintarBarra: function (usuario) {
        if ($("#usuarioSesion").length) {
            $("#usuarioSesion").html(
                '<i class="bi bi-person-circle"></i> ' +
                escapar(usuario.rol.charAt(0) + usuario.rol.slice(1).toLowerCase()) +
                ' <span class="badge bg-light text-primary">#' + usuario.userId + '</span>'
            );
        }

        // Oculta/enlaza según data-solo-rol="DIRECTOR,PROFESOR"
        $("#menuNavegacion [data-solo-rol]").each(function () {
            const permitidos = $(this).data("solo-rol").toString().split(",");
            $(this).toggleClass("d-none", permitidos.indexOf(usuario.rol) === -1);
        });

        // Oculta los elementos con data-ocultar-rol="PROFESOR"
        $("#menuNavegacion [data-ocultar-rol], main [data-ocultar-rol], [data-ocultar-rol]").each(function () {
            const ocultar = $(this).data("ocultar-rol").toString().split(",");
            $(this).toggleClass("d-none", ocultar.indexOf(usuario.rol) !== -1);
        });

        if ($("#btnSalir").length) {
            $("#btnSalir").off("click").on("click", Sesion.salir);
        }
    },

    /** POST /api/auth/logout y vuelta al login. */
    salir: function () {
        $.ajax({
            url: "/api/auth/logout",
            method: "POST",
            contentType: "application/json; charset=UTF-8",
            dataType: "json",
            complete: function () {
                location.replace("login.html");
            }
        });
    },

    /** Devuelve true si el usuario tiene el rol indicado ("ADMIN", ...). */
    es: function (rol) {
        return !!this.usuario && this.usuario.rol === rol;
    }
};
