# Documentación del Frontend — Transmisión de datos con la API REST

> **Proyecto:** `profemateria` (Spring Boot 4.1.1 · Java 21 · MySQL)
> **Frontend:** HTML + Bootstrap 5 + AJAX (jQuery `$.ajax`)
> **Sesión:** Spring Security con cookie `JSESSIONID` y 3 roles
> (`ADMIN`, `DIRECTOR`, `PROFESOR`) — ver sección 2.
>
> | Archivo | Ruta | Contenido |
> |---|---|---|
> | `login.html` | `profemateria/src/main/resources/static/login.html` | **Acceso** (punto de entrada, sin sesión) |
> | `index.html` | `profemateria/src/main/resources/static/index.html` | Vista de **Materias** (DIRECTOR/PROFESOR) |
> | `profesores.html` | `profemateria/src/main/resources/static/profesores.html` | Vista de **Profesores** (DIRECTOR) |
> | `directores.html` | `profemateria/src/main/resources/static/directores.html` | Alta/listado de **directores** (ADMIN) |
> | `cambiar-password.html` | `profemateria/src/main/resources/static/cambiar-password.html` | Cambio de contraseña (primer acceso) |
> | `sesion.js` | `profemateria/src/main/resources/static/js/sesion.js` | Guardia de sesión/roles (`Sesion.iniciar`) y logout |
> | `login.js` | `profemateria/src/main/resources/static/js/login.js` | AJAX de `POST /api/auth/login` |
> | `cambiar-password.js` | `profemateria/src/main/resources/static/js/cambiar-password.js` | AJAX de `POST /api/auth/password` |
> | `app.js` | `profemateria/src/main/resources/static/js/app.js` | AJAX de Materias (`/api/materias`) |
> | `profesores.js` | `profemateria/src/main/resources/static/js/profesores.js` | AJAX de Profesores (`/api/profesor`) |
> | `directores.js` | `profemateria/src/main/resources/static/js/directores.js` | AJAX de Directores (`/api/admin/directores`) |
> | `common.js` | `profemateria/src/main/resources/static/js/common.js` | Utilidades AJAX compartidas + redirección global 401/403 |
> | `style.css` | `profemateria/src/main/resources/static/css/style.css` | Estilos propios |

---

## 1. Arquitectura general

```
┌──────────────────────────────── NAVEGADOR ────────────────────────────────┐
│  index.html (Materias)      profesores.html (Profesores)   Bootstrap 5   │
│      │                             │                                     │
│      │  app.js / profesores.js  →  $.ajax()  (jQuery)                    │
│      │  (utilidades comunes en common.js)                                │
│      │      · serializa objetos JS a texto JSON   (JSON.stringify)       │
│      │      · envía peticiones HTTP                (XHR)                 │
│      │      · parsea las respuestas a objetos JS  (JSON.parse)           │
└──────┼─────────────────────────────┼──────────────────────────────────────┘
       │  HTTP/1.1 (puerto 8080, mismo origen · cookie JSESSIONID)
       ▼
┌──────────────────────────── SPRING BOOT ──────────────────────────────────┐
│  SecurityFilterChain (SecurityConfig) ── sin sesión → 401 JSON            │
│  ForzarCambioPasswordFilter ── password_changed=0 → 403 JSON              │
│  AuthRestController(/api/auth)   AdminRestController (/api/admin)         │
│  MateriaRestController (/api/materias)   ProfesorRestController(/api/profesor)│
│      · @RequestBody  → Jackson deserializa JSON  → objeto entidad        │
│      · @ResponseBody → Jackson serializa objeto  → JSON                  │
│           │                                  │                           │
│           ▼                                  ▼                           │
│  MateriaDAO / MateriaDAOImpl        ProfesorDAO / ProfesorDAOImpl         │
│  (JPA · EntityManager)              (JPA · EntityManager)                 │
│           │                                  │                           │
│           ▼                                  ▼                           │
│  MySQL tablas `materia` y `profesor`  (api_rest_spring-boot)             │
└──────────────────────────────────────────────────────────────────────────┘
```

**Dato clave:** los HTML se sirven desde la **misma** aplicación Spring Boot
(`src/main/resources/static`), así que no hay problema de CORS en el uso
normal **y la cookie de sesión funciona sin ajustes** (mismo origen). Además
los controladores de materias y profesores llevan `@CrossOrigin(origins = "*")`
para permitir abrir las páginas desde otro origen (por ejemplo, un servidor de
estáticos separado).

---

## 2. Sesión, autenticación y roles

### 2.1 Flujo de acceso

```
login.html ── POST /api/auth/login {username, password} ──▶ cookie JSESSIONID
     │
     ├─ passwordChanged = false ──▶ cambiar-password.html
     │        └── POST /api/auth/password {nuevaPassword} ──▶ inicio del rol
     │
     └─ passwordChanged = true
            ├─ rol ADMIN     ──▶ directores.html
            ├─ rol DIRECTOR  ──▶ index.html   (materias + profesores)
            └─ rol PROFESOR  ──▶ index.html   (sólo sus materias)
```

El `username` del login **es el `user_id`** (numérico): `1000` para el
administrador, y para directores/profesores el mismo id que su fila en
`profesor`. La contraseña viaja en el body JSON (HTTP en local; usa HTTPS en
producción) y se guarda cifrada con **BCrypt** en `users.password`. El login
**rota la sesión** (invalida la cookie previa) para evitar fijación de
sesión.

### 2.2 Endpoints de sesión — `/api/auth` y `/api/admin`

| Verbo | Ruta | Body (request) | Response `200` | Errores |
|---|---|---|---|---|
| POST | `/api/auth/login` | `{"username":"1000","password":"..."}` | datos de sesión | `401` credenciales |
| GET | `/api/auth/me` | — | datos de sesión | `401` sin sesión |
| POST | `/api/auth/logout` | — | `{"ok":true,"message":"Sesión cerrada"}` | — |
| POST | `/api/auth/password` | `{"nuevaPassword":"nueva123"}` | `{"ok":true,"message":"Contraseña actualizada"}` | `400` (<6 caracteres), `401` |
| GET | `/api/admin/directores` | — | array de directores | `401`, `403` si no es ADMIN |
| POST | `/api/admin/directores` | `{"nombre","apellidos","direccion"}` | `{profesor, userId, rol, passwordPorDefecto, message}` | `400` campos vacíos, `403` |

Datos de sesión (devueltos por `login` y `me`):

```json
{
  "userId": 1000,
  "username": "1000",
  "authority": "ROLE_ADMIN",
  "rol": "ADMIN",
  "passwordChanged": false,
  "passwordPorDefecto": "admin1234"
}
```

`passwordPorDefecto` es `null` cuando `passwordChanged` ya es `true`
(sólo se revela mientras el usuario tenga la contraseña de fábrica).

Cuerpos de error de la capa de seguridad (JSON puro, sin HTML):

```json
{ "status": 401, "error": "No autenticado", "path": "/api/materias" }
{ "status": 403, "error": "Acceso denegado", "path": "/api/profesor" }
{ "status": 403, "error": "Debe cambiar su contraseña para continuar",
  "code": "PASSWORD_CHANGE_REQUIRED", "path": "/api/materias" }
```

### 2.3 Matriz de acceso por recurso

| Recurso | `ADMIN` | `DIRECTOR` | `PROFESOR` |
|---|---|---|---|
| `GET/POST/PUT/DELETE /api/materias` | `403` | todas | sólo las suyas (`id_profesor` = su id) |
| `GET/POST/PUT/DELETE /api/profesor` | `403` | sí | `403` |
| `GET/POST /api/admin/directores` | sí | `403` | `403` |
| `POST /api/auth/login` | público (sin sesión) | — | — |
| `GET /api/auth/me`, `POST .../logout`, `POST .../password` | sesión válida | sesión válida | sesión válida |
| `login.html` / `cambiar-password.html` | sí | sí | sí |
| `index.html` (Materias) | redirige a `directores.html` | sí | sí |
| `profesores.html` | redirige | sí | redirige a `index.html` |
| `directores.html` | sí | redirige a `index.html` | redirige a `index.html` |

### 2.4 Cómo se aplica en el frontend

- **Guardia de página** (`sesion.js`): cada página protegida arranca con
  `Sesion.iniciar({ roles: [...] })`, que consulta `GET /api/auth/me` y sólo
  resuelve el `Deferred` si el usuario puede quedarse; si no, redirige
  (`401` → `login.html`, `passwordChanged = false` → `cambiar-password.html`,
  rol no permitido → página de inicio de su rol).

  ```js
  Sesion.iniciar({ roles: ["DIRECTOR"] }).done(function (usuario) {
      listarProfesores();   // sólo se ejecuta si pasó la guardia
  });
  ```

- **Barra de navegación**: `Sesion.pintarBarra()` muestra el rol y el id del
  usuario, y oculta cada elemento de menú con el atributo declarativo
  `data-solo-rol="DIRECTOR,PROFESOR"` (sólo se muestra para esos roles). En
  `index.html`, además, `app.js` oculta el campo *ID Profesor* y muestra un
  aviso cuando el usuario es `PROFESOR` (la materia se le asigna sola).

- **Redirección global** (`common.js`): un manejador `$(document).ajaxError`
  convierte cualquier `401` en salto a `login.html` y cualquier `403` con
  `code = "PASSWORD_CHANGE_REQUIRED"` en salto a `cambiar-password.html`
  (sin bucle dentro de esas dos páginas). Así, aunque un endpoint falle en
  mitad de una acción, el usuario siempre cae en la pantalla correcta.

- **Logout**: `Sesion.salir()` → `POST /api/auth/logout` → `location.replace("login.html")`.

---

## 3. Cómo se transmite cada dato

### 3.1 Objeto JavaScript → HTTP request (salida)

En `common.js` la función `serializar()` aplica `JSON.stringify()` (la usan
tanto `app.js` como `profesores.js`):

```js
// objeto JS en memoria
{ nombre: "Álgebra", creditos: 6, horasCatedra: 48, idProfesor: 1 }

        │  JSON.stringify(objeto)
        ▼

// texto JSON (lo único que viaja por la red)
'{"nombre":"Álgebra","creditos":6,"horasCatedra":48,"idProfesor":1}'
```

Ese texto se coloca en el **body** de la petición con estas cabeceras:

```http
Content-Type: application/json; charset=UTF-8
Accept: application/json, text/javascript, */*; q=0.01   (lo pone jQuery)
```

En `$.ajax` eso se controla con tres opciones (`app.js:161-172` para POST en
materias; `profesores.js` para profesores):

```js
$.ajax({
    url:         API_URL,
    method:      "POST",
    contentType: "application/json; charset=UTF-8", // cabecera del body
    data:        JSON.stringify(datos),             // body (texto JSON)
    dataType:    "json"                             // formato de la respuesta
});
```

> **`data` vs `dataType`:** `data` es lo que se **envía**; `dataType` es lo
> que se **espera recibir**. jQuery, al ver `dataType: "json"`, hace
> `JSON.parse()` automático y la variable `data` del callback ya es un
> objeto JavaScript.
>
> **`processData` / `contentType`:** como `data` ya es un *string* JSON y
> fijamos `contentType` a mano, jQuery no intenta convertir el objeto a
> `application/x-www-form-urlencoded`.

### 3.2 HTTP request → objeto Java (entrada al backend)

Spring recibe el body y lo convierte con **Jackson**:

```java
@PostMapping("/materias")
public Materia save(@RequestBody Materia materia) { ... }
//             ^^^^^^^^^^ le indica a Spring: "lee el body JSON y
//                        mápialo a los campos de Materia"
```

El mapeo de campos es **por nombre exacto** (camelCase → snake_case):

| JSON (navegador) | Atributo Java (`Materia.java`) | Columna MySQL |
|---|---|---|
| `idMateria` | `private int idMateria;` | `id` (PK autoincrement) |
| `nombre` | `private String nombre;` | `nombre` |
| `creditos` | `private int creditos;` | `creditos` |
| `horasCatedra` | `private int horasCatedra;` | `horas_catedra` |
| `idProfesor` | `private int idProfesor;` | `id_profesor` (FK → `profesor.id`) |
| `profesor` | `private Profesor profesor;` (`@ManyToOne`) | (solo lectura, misma columna) |

⚠️ Si el frontend enviara `horas_catedra` (snake_case) en vez de
`horasCatedra`, Jackson **no lo reconocería**, el campo quedaría en `0` y la
petición terminaría igualmente en 200. Por eso
`obtenerDatosDelFormulario()` (`app.js:257`) usa los nombres camelCase
exactos.

### 3.3 Respuesta HTTP → objeto JavaScript (entrada al navegador)

```java
return materia;   // MateriaRestController
```

Jackson serializa el objeto a texto JSON → viaja en el body con
`Content-Type: application/json` → jQuery hace `JSON.parse()` → el callback
recibe un objeto JS plano:

```js
success: function (data) {   // data ya es { idMateria: 1, nombre: "..." }
```

---

## 4. Endpoints y flujo de cada operación

**Base URL:** `/api/materias` (relativa al origen de la página).

### 4.1 LISTAR — `GET /api/materias`

| Fase | Qué viaja |
|---|---|
| Request | `GET /api/materias` — sin body, sin `Content-Type` |
| Backend | DIRECTOR → `materiaDAO.findAll()` · PROFESOR → `materiaDAO.findByProfesor(id)` (`WHERE id_profesor = su id`) |
| Response | `200 OK`, `Content-Type: application/json`, **array** |

> Con sesión de **PROFESOR** el array sólo contiene **sus** materias: el
> filtrado lo hace el backend, no el frontend. Un `ADMIN` recibe `403`.
> Sin sesión: `401` JSON (ver sección 2).

```json
[
  {
    "idMateria": 1, "nombre": "Álgebra", "creditos": 6,
    "horasCatedra": 48, "idProfesor": 1,
    "profesor": { "idProfesor": 1, "nombre": "Ana", "apellidos": "Gómez", "direccion": null }
  },
  {
    "idMateria": 2, "nombre": "Cálculo", "creditos": 8,
    "horasCatedra": 64, "idProfesor": 2,
    "profesor": { "idProfesor": 2, "nombre": "Luis", "apellidos": "Pérez", "direccion": null }
  }
]
```

> **Relación con `profesor`:** la entidad `Materia` mapea su columna FK
> `id_profesor` de dos formas complementarias (`Materia.java`):
>
> ```java
> @Column(name = "id_profesor")
> private int idProfesor;                       // ← se ENVÍA en POST/PUT
>
> @ManyToOne(fetch = FetchType.EAGER)
> @JoinColumn(name = "id_profesor", referencedColumnName = "id",
>             insertable = false, updatable = false)
> private Profesor profesor;                    // ← solo LECTURA (se recibe)
> ```
>
> * `idProfesor` (int) es el campo **escribible**: es lo que el frontend sigue
>   mandando igual que antes en el body (`{"idProfesor": 1}`).
> * `profesor` es la relación JPA **de solo lectura** (`insertable = false,
>   updatable = false`): no se escribe desde el JSON, pero el backend la
>   **rellena** al leer y expone el objeto completo del profesor. Si el
>   frontend enviara un objeto `"profesor"`, se ignoraría; lo que manda es
>   `idProfesor`.
> * La FK real (`CONSTRAINT id_profesor FOREIGN KEY (id_profesor) REFERENCES
>   profesor(id)`) ya existe en MySQL, así que un `idProfesor` inexistente
>   provoca error 500 (violación de FK).

Código: `listarMaterias()` → `app.js:33` · render en `renderizarTabla()` → `app.js:60`.

### 4.2 BUSCAR UNO — `GET /api/materias/{id}`

| Fase | Qué viaja |
|---|---|
| Request | `GET /api/materias/3` — el id va en la **ruta** (path variable) |
| Backend | `materiaDAO.findById(3)` |
| Response | `200 OK` + objeto JSON, **o body vacío** si no existe |

⚠️ **Particularidad:** `findById` devuelve `null` cuando no hay coincidencia
y el controlador no tiene `@ResponseStatus(NOT_FOUND)`, así que la API
responde `200` con el body vacío. El frontend lo detecta en
`app.js:121` (`if (data === null)`) y muestra un aviso.

### 4.3 CREAR — `POST /api/materias`

Flujo completo de la transmisión:

```
1. El usuario rellena el formulario de index.html
2. submit → e.preventDefault()                        (app.js:334)
3. validarFormulario("#formMateria") — Constraint Validation de HTML5
      (el backend no valida campos, sólo reglas de negocio — ver sección 7)
4. obtenerDatosDelFormulario() → objeto JS             (app.js:257)
      { nombre, creditos, horasCatedra, idProfesor }   ← SIN idMateria
5. JSON.stringify(datos)  → texto JSON
6. $.ajax envía:
      POST /api/materias
      Content-Type: application/json; charset=UTF-8

      {"nombre":"Álgebra","creditos":6,"horasCatedra":48,"idProfesor":1}
7. Spring: @RequestBody + Jackson → new Materia(...) con idMateria = 0
8. materiaDAO.save() → entityManager.persist() → INSERT
      MySQL genera el id autoincrement (IDENTITY)
9. El controlador devuelve la Materia YA CON su idMateria nuevo
10. Response: 200 OK + {"idMateria":7,"nombre":"Álgebra",...}
11. success → mensaje de éxito + listarMaterias() refresca la tabla
```

Nota: en modo creación se hace `delete datos.idMateria` (`app.js:343`) para
no mandar `idMateria: 0` (innecesario; la BD asigna el id).

### 4.4 ACTUALIZAR — `PUT /api/materias`

Mismo body que POST **pero con `idMateria` incluido** (el identificador viaja
dentro del JSON, no en la URL):

```json
{ "idMateria": 3, "nombre": "Álgebra II", "creditos": 6, "horasCatedra": 48, "idProfesor": 1 }
```

El DAO (`MateriaDAOImpl.update`) busca la fila por `idMateria`; si no
existe, `entityManager.merge()` **inserta una fila nueva** (comportamiento
*upsert*). La respuesta es `200 OK` con el objeto reflejado.

Código: `actualizarMateria()` → `app.js:194`.

### 4.5 ELIMINAR — `DELETE /api/materias/{id}`

| Fase | Qué viaja |
|---|---|
| Request | `DELETE /api/materias/3` — id en la ruta, **sin body** |
| Backend | `materiaDAO.delete(3)` → `DELETE FROM materia WHERE id=3` |
| Response | `200 OK` con **texto plano** (`text/plain`), no JSON |

```
Materia eliminada - id: 3
```

Por eso el AJAX declara `dataType: "text"` (`app.js:233`): si se pidiera
`"json"`, jQuery fallaría al hacer `JSON.parse("Materia eliminada - id: 3")`.
La UI abre antes un modal de confirmación (`abrirModalEliminar()` → `app.js:307`).

### 4.6 Recurso Profesor — `/api/profesor`

Se gestiona desde **`profesores.html` + `profesores.js`**. Las reglas de
transmisión son idénticas a las de Materias (mismo `$.ajax`, mismo
`Content-Type`, mismo `dataType`); solo cambian la ruta y los campos.

Entidad `Profesor` (JSON ↔ Java ↔ MySQL):

| JSON (navegador) | Atributo Java (`Profesor.java`) | Columna MySQL |
|---|---|---|
| `idProfesor` | `private int idProfesor;` | `id` (PK autoincrement) |
| `nombre` | `private String nombre;` | `nombre` |
| `apellidos` | `private String apellidos;` | `apellidos` |
| `direccion` | `private String direccion;` | `direccion` (nullable) |

| Método | Ruta | Request | Response | `dataType` jQuery |
|---|---|---|---|---|
| GET | `/api/profesor` | — | array JSON | `"json"` |
| GET | `/api/profesor/{id}` | id en la ruta | objeto JSON o vacío | `"json"` |
| POST | `/api/profesor` | objeto **sin** `idProfesor` | objeto del profesor **+** `userId`, `rol`, `passwordPorDefecto`, `message` | `"json"` |
| PUT | `/api/profesor` | objeto **con** `idProfesor` | objeto actualizado | `"json"` |
| DELETE | `/api/profesor/{id}` | id en la ruta, sin body | **texto plano** | `"text"` |

⚠️ **El POST ya no devuelve sólo el profesor**: además crea su usuario en
`users`/`authorities` (`ROLE_PROFESOR`, `password_changed = 0`) y lo refleja
en la respuesta:

```json
{
  "idProfesor": 5, "nombre": "Ana", "apellidos": "Gómez", "direccion": null,
  "userId": 5, "rol": "PROFESOR", "passwordPorDefecto": "1234",
  "message": "Profesor dado de alta. Inicie sesión con la contraseña por defecto y cámbiela en el primer acceso."
}
```

La respuesta completa queda registrada en la **consola de peticiones** de la
página (el aviso de éxito sólo muestra nombre e id). El `userId` y la
`passwordPorDefecto` son para que el director se los comunique al profesor;
en `directores.html` sí hay un modal dedicado con esos datos. Si la creación
del usuario falla (p. ej. id duplicado), el backend **deshace el alta** del
profesor (rollback manual) y devuelve `400` con `message`.

Restricciones de negocio (devuelven `403` JSON vía `ApiExceptionHandler`):

- Un **DIRECTOR no puede editarse ni darse de baja a sí mismo** desde
  `profesores.html` (debe hacerlo el ADMIN desde `directores.html`).
- El propio `ADMIN` no tiene acceso a `/api/profesor/**` (lo impide la cadena
  de seguridad).

Ejemplo de respuesta de `GET /api/profesor`:

```json
[
  { "idProfesor": 1, "nombre": "Hubert", "apellidos": "Farnsworth", "direccion": "Planet Express" },
  { "idProfesor": 2, "nombre": "Ogden",  "apellidos": "Wernstrom",  "direccion": "Mars University" }
]
```

El DELETE responde texto plano, p. ej. `Profesor eliminado - id 3` (por eso
`dataType: "text"` en `profesores.js`).

⚠️ **Clave foránea:** `materia.id_profesor → profesor.id`. Si se intenta
borrar un profesor que tiene materias asignadas, MySQL rechaza el `DELETE`
(HTTP 500) y el registro **no** se elimina (tampoco se toca su usuario). La
página lo avisa en el modal. Si el borrado se ejecuta, el backend elimina
también las filas del usuario en `authorities`/`users`.

Código: `listarProfesores()` → `profesores.js:30` · `crearProfesor()` →
`profesores.js:150` · `actualizarProfesor()` → `profesores.js:181` ·
`eliminarProfesor()` → `profesores.js:214` · `verMateriasDeProfesor()` →
`profesores.js` (subrecurso, ver 4.7).

---

### 4.7 Endpoints de relación (subrecurso)

Ambos endpoints explotan la relación `@ManyToOne` `Materia → Profesor` y se
consumen solo con **GET** (no tienen body de petición): el id va en la ruta y
el servidor devuelve datos ya relacionados.

| Método | Ruta | Request | Response | `dataType` jQuery |
|---|---|---|---|---|
| GET | `/api/materias/{id}/profesor` | id de la materia en la ruta | objeto JSON `Profesor` (vacío si la materia no existe o no tiene profesor) | `"json"` |
| GET | `/api/profesor/{id}/materias` | id del profesor en la ruta | array JSON de `Materia` (vacío `[]` si no imparte ninguna) | `"json"` |

- **`GET /api/materias/{id}/profesor`** → en el backend
  `MateriaRestController.findProfesorByMateria()` llama a
  `MateriaDAO.findProfesorByMateria()`, que hace `find(Materia.class, id)` y
  devuelve `materia.getProfesor()`. Si la materia no existe, devuelve `null`
  ⇒ respuesta **200 con body vacío**.
- **`GET /api/profesor/{id}/materias`** → en el backend
  `ProfesorRestController.findMateriasByProfesor()` ejecuta la consulta JPQL
  `FROM Materia m WHERE m.idProfesor = :idProfesor` a través de
  `ProfesorDAO.findMateriasByProfesor()`. Un id inexistente devuelve
  **200 con `[]`** (nunca `null`).

Ejemplo — `GET /api/materias/3/profesor`:

```json
{ "idProfesor": 1, "nombre": "Hubert", "apellidos": "Farnsworth", "direccion": "Planet Express" }
```

Ejemplo — `GET /api/profesor/1/materias` (cada materia incluye su profesor
anidado de solo lectura):

```json
[
  { "idMateria": 3, "nombre": "Introducción a la Iniciación", "creditos": 80, "horasCatedra": 450, "idProfesor": 1,
    "profesor": { "idProfesor": 1, "nombre": "Hubert", "apellidos": "Farnsworth", "direccion": "Planet Express" } }
]
```

En el frontend se muestran en un **modal de Bootstrap**: en `index.html` el
botón *Profesor* de cada fila (y de la búsqueda) llama a
`verProfesorDeMateria()` → `app.js`; en `profesores.html` el botón
*Materias* llama a `verMateriasDeProfesor()` → `profesores.js`.

---

## 5. Matriz resumen de la transmisión

| Operación | Verbo | Ruta | Body (request) | Content-Type request | Body (response) | Content-Type response | `dataType` jQuery |
|---|---|---|---|---|---|---|---|
| Listar | GET | `/api/materias` | — | — | array JSON | `application/json` | `"json"` |
| Buscar | GET | `/api/materias/{id}` | — | — | objeto JSON o vacío | `application/json` | `"json"` |
| Crear | POST | `/api/materias` | objeto **sin** `idMateria` | `application/json` | objeto con `idMateria` nuevo | `application/json` | `"json"` |
| Actualizar | PUT | `/api/materias` | objeto **con** `idMateria` | `application/json` | objeto actualizado | `application/json` | `"json"` |
| Eliminar | DELETE | `/api/materias/{id}` | — | — | texto plano | `text/plain` | `"text"` |
| Listar | GET | `/api/profesor` | — | — | array JSON | `application/json` | `"json"` |
| Buscar | GET | `/api/profesor/{id}` | — | — | objeto JSON o vacío | `application/json` | `"json"` |
| Crear | POST | `/api/profesor` | objeto **sin** `idProfesor` | `application/json` | profesor + `userId`, `rol`, `passwordPorDefecto` | `application/json` | `"json"` |
| Actualizar | PUT | `/api/profesor` | objeto **con** `idProfesor` | `application/json` | objeto actualizado | `application/json` | `"json"` |
| Eliminar | DELETE | `/api/profesor/{id}` | — | — | texto plano | `text/plain` | `"text"` |
| Profesor de la materia | GET | `/api/materias/{id}/profesor` | — | — | objeto JSON o vacío | `application/json` | `"json"` |
| Materias del profesor | GET | `/api/profesor/{id}/materias` | — | — | array JSON | `application/json` | `"json"` |

> Todas las filas de esta tabla asumen una **sesión válida con el rol adecuado**;
> sin ella la respuesta es `401`/`403` en JSON. Los endpoints de sesión
> (`/api/auth`) y de administración (`/api/admin`) están en la
> [sección 2](#2-sesión-autenticación-y-roles).

---

## 6. Manejo de errores

Hay **tres fuentes** de error, todas ellas en JSON (nunca HTML de error):

1. **Capa de seguridad** (`SecurityConfig`, filtros) → `401` sin sesión,
   `403` sin rol y `403` con `code = "PASSWORD_CHANGE_REQUIRED"`.
2. **`ApiExceptionHandler`** (`@RestControllerAdvice`) → traduce
   `NoAutorizadoException` a `403` e `IllegalStateException` a `400`,
   siempre con `{status, error, message, path}`.
3. **JSON por defecto de Spring Boot** para el resto (type mismatch, rutas
   inexistentes, `500` por violación de FK…). Gracias a
   `server.error.include-message=always` el campo `message` también viaja:

```json
{
  "timestamp": "2026-10-15T10:00:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Required request body is missing",
  "path": "/api/materias"
}
```

Situaciones posibles y su comportamiento:

| Causa | HTTP | Cuerpo | Reacción del frontend |
|---|---|---|---|
| Sin sesión / cookie caducada | 401 | `{"status":401,"error":"No autenticado",...}` | salto a `login.html` (`ajaxError` global en `common.js`) |
| Rol insuficiente (p. ej. PROFESOR en `/api/profesor`) | 403 | `{"status":403,"error":"Acceso denegado",...}` o `{"message":"Sólo puede gestionar sus propias materias…"}` | alerta roja con `mensajeError()` |
| Contraseña por defecto sin renovar | 403 | `code: "PASSWORD_CHANGE_REQUIRED"` | salto a `cambiar-password.html` |
| Contraseña < 6 caracteres / campos de alta vacíos / usuario duplicado | 400 | `{"status":400,"error":"…","message":"…"}` | alerta roja con el `message` |
| Login con credenciales incorrectas | 401 | `{"status":401,"error":"Usuario o contraseña incorrectos"}` | alerta roja en `login.html` |
| JSON malformado / id no numérico | 400 | JSON de error de Spring | alerta roja con `mensajeError()` |
| `idProfesor` inexistente al crear materia (violación FK) | 500 | JSON de error de Spring | alerta roja; el registro **no** se crea |
| Borrar profesor con materias asignadas (violación FK) | 500 | JSON de error de Spring | alerta roja; el profesor **no** se elimina |
| Backend caído / puerto cerrado | 0 | — | "No se pudo contactar con la API…" |
| ID inexistente en búsqueda | 200 | body vacío | aviso ámbar "No existe ninguna materia con ID n" |
| ID inexistente en endpoint de relación | 200 | body vacío / `[]` | modal con "sin profesor asignado" / "no imparte materias" |
| DELETE de id inexistente | 200 | texto de éxito igualmente | la API lo trata como no-op (quirk documentado) |

En todos los casos el detalle también queda impreso en la **consola de
peticiones** de la propia página (bloque final de cada HTML), que muestra
hora, verbo, URL, body enviado y respuesta recibida.

---

## 7. Validación

* **Frontend:** HTML5 Constraint Validation (`required`, `min`, `max`,
  `maxlength`) + `checkValidity()` en `validarFormulario(selector)`
  (`common.js`), y comprobaciones JS extra (las dos contraseñas coinciden).
* **Backend:** no usa `@Valid`/`jakarta.validation` (no valida rangos ni
  nulos de los payload de materias/profesores), pero **sí aplica reglas de
  negocio**, devolviendo JSON:
  * `POST /api/auth/password` → `400` si la nueva contraseña tiene menos de
    6 caracteres.
  * `POST /api/admin/directores` → `400` si faltan `nombre` o `apellidos`.
  * Altas de usuario duplicadas → `400` (`IllegalStateException`).
  * Pertenencia (materia propia del profesor, ADMIN fuera de
    materias/profesores, director autoeditándose) → `403`
    (`NoAutorizadoException`).
* Cualquier otro payload JSON que Jackson pueda mapear se persiste sin
  comprobar rangos ni nulos (p. ej. `creditos` negativos).

---

## 8. Cómo ejecutarlo

### 8.1 Configuración de credenciales (`.env`)

Las credenciales de MySQL **no** se guardan en `application.properties`.
Este archivo solo declara variables (`${DB_URL}`, `${DB_USERNAME}`,
`${DB_PASSWORD}`) y carga un `.env` local:

```properties
# application.properties
spring.config.import=optional:file:./.env[.properties]
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
```

1. Copiar la plantilla y rellenarla:
   ```bash
   cp profemateria/.env.example profemateria/.env
   ```
2. `.env` (ignorado por git) contiene:
   ```properties
   DB_URL=jdbc:mysql://host.docker.internal:3306/api_rest_spring-boot
   DB_USERNAME=root
   DB_PASSWORD=tu_password
   ```

> `spring.config.import=optional:file:./.env[.properties]` hace que Spring
> Boot lea el `.env` como si fuera un `.properties` (el sufijo `[.properties]`
> es el *extension hint*, porque el archivo no tiene extensión). `optional:`
> evita el fallo si no existe; en ese caso se usarían variables de entorno
> del sistema (útil en CI/Docker). Si no se define ninguna de las dos, el
> arranque falla con *"Could not resolve placeholder 'DB_URL'"*.

### 8.2 Arrancar

```bash
cd profemateria
./mvnw spring-boot:run
```

1. Abrir **<http://localhost:8080/login.html>** y entrar con el usuario
   correspondiente (ADMIN `1000`, o el director/profesor dado de alta).
   Cada usuario aterriza en la página de su rol; si aún no cambió la
   contraseña, en `cambiar-password.html`.
2. Cada página carga su listado automáticamente (`GET /api/materias`,
   `GET /api/profesor` o `GET /api/admin/directores`) y sólo tras pasar la
   guardia `Sesion.iniciar({ roles: [...] })`.
3. Cada acción de la UI dispara su `$.ajax` y queda registrada en la
   consola de peticiones al final de la página. Se navega con la barra
   superior (visible según rol) y se sale con el botón *Salir*.

Requisitos: MySQL accesible en `host.docker.internal:3306` con la base
`api_rest_spring-boot` (script en `data/generar_base_de_datos.sql`; para una
BD anterior añade `data/migracion_spring_security.sql`). El administrador se
crea solo al arrancar.

---

## 9. Pruebas rápidas con curl (equivalente manual de cada AJAX)

Todo requiere sesión: primero haz **login** (el `username` es el `user_id`)
y reutiliza la cookie en las siguientes llamadas con `-b`.

```bash
# ===== 1) SESIÓN =====
# Sin cookie → 401 {"status":401,"error":"No autenticado",...}

# Ej. DIRECTOR (id 1, contraseña por defecto 1234)
curl -s -c cookies.txt -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"1","password":"1234"}'

# Usuario autenticado → GET /api/auth/me  → login.js / sesion.js
curl -s -b cookies.txt http://localhost:8080/api/auth/me

# Cambiar contraseña (primer acceso) → cambiar-password.js
curl -s -b cookies.txt -X POST http://localhost:8080/api/auth/password \
  -H "Content-Type: application/json" \
  -d '{"nuevaPassword":"nueva123"}'

# ===== 2) MATERIAS (/api/materias) — DIRECTOR y PROFESOR =====

# LISTAR  → listarMaterias()   (PROFESOR: sólo las suyas)
curl -s -b cookies.txt http://localhost:8080/api/materias

# BUSCAR  → buscarPorId()
curl -s -b cookies.txt http://localhost:8080/api/materias/1

# CREAR   → crearMateria()
curl -s -b cookies.txt -X POST http://localhost:8080/api/materias \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Álgebra","creditos":6,"horasCatedra":48,"idProfesor":1}'

# EDITAR  → actualizarMateria()
curl -s -b cookies.txt -X PUT http://localhost:8080/api/materias \
  -H "Content-Type: application/json" \
  -d '{"idMateria":1,"nombre":"Álgebra II","creditos":6,"horasCatedra":48,"idProfesor":1}'

# BORRAR  → eliminarMateria()
curl -s -b cookies.txt -X DELETE http://localhost:8080/api/materias/1

# ===== 3) PROFESORES (/api/profesor) — sólo DIRECTOR =====
# (con sesión de PROFESOR o ADMIN → 403)

# LISTAR  → listarProfesores()
curl -s -b cookies.txt http://localhost:8080/api/profesor

# BUSCAR  → buscarPorId()
curl -s -b cookies.txt http://localhost:8080/api/profesor/1

# CREAR   → crearProfesor()  (crea también el usuario ROLE_PROFESOR)
curl -s -b cookies.txt -X POST http://localhost:8080/api/profesor \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellidos":"Gómez","direccion":"Calle 1"}'

# EDITAR  → actualizarProfesor()
curl -s -b cookies.txt -X PUT http://localhost:8080/api/profesor \
  -H "Content-Type: application/json" \
  -d '{"idProfesor":1,"nombre":"Hubert","apellidos":"Farnsworth","direccion":"Planet Express"}'

# BORRAR  → eliminarProfesor()
curl -s -b cookies.txt -X DELETE http://localhost:8080/api/profesor/4

# ===== 4) RELACIÓN (subrecurso) =====

# PROFESOR DE UNA MATERIA  → verProfesorDeMateria()
curl -s -b cookies.txt http://localhost:8080/api/materias/3/profesor

# MATERIAS DE UN PROFESOR  → verMateriasDeProfesor()
curl -s -b cookies.txt http://localhost:8080/api/profesor/1/materias

# ===== 5) ADMINISTRACIÓN — otra sesión, rol ADMIN =====

curl -s -c admin.txt -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"1000","password":"admin1234"}'

# LISTAR directores → directores.js
curl -s -b admin.txt http://localhost:8080/api/admin/directores

# ALTA de director (muestra passwordPorDefecto en la respuesta)
curl -s -b admin.txt -X POST http://localhost:8080/api/admin/directores \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ogden","apellidos":"Wernstrom","direccion":"Mars University"}'

# Cerrar sesión (invalida la cookie)
curl -s -b cookies.txt -X POST http://localhost:8080/api/auth/logout
```
