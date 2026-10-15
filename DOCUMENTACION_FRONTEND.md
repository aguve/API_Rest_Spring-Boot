# Documentación del Frontend — Transmisión de datos con la API REST

> **Proyecto:** `profemateria` (Spring Boot 4.1.1 · Java 21 · MySQL)
> **Frontend:** HTML + Bootstrap 5 + AJAX (jQuery `$.ajax`)
>
> Dos recursos con su propia página: **Materias** y **Profesores**.
>
> | Archivo | Ruta | Contenido |
> |---|---|---|
> | `index.html` | `profemateria/src/main/resources/static/index.html` | Vista de **Materias** |
> | `profesores.html` | `profemateria/src/main/resources/static/profesores.html` | Vista de **Profesores** |
> | `app.js` | `profemateria/src/main/resources/static/js/app.js` | AJAX de Materias (`/api/materias`) |
> | `profesores.js` | `profemateria/src/main/resources/static/js/profesores.js` | AJAX de Profesores (`/api/profesor`) |
> | `common.js` | `profemateria/src/main/resources/static/js/common.js` | Utilidades AJAX compartidas por ambas páginas |
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
       │  HTTP/1.1 (puerto 8080, mismo origen)
       ▼
┌──────────────────────────── SPRING BOOT ──────────────────────────────────┐
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
normal. Además ambos controladores llevan `@CrossOrigin(origins = "*")` para
permitir abrir las páginas desde otro origen (por ejemplo, un servidor de
estáticos separado).

---

## 2. Cómo se transmite cada dato

### 2.1 Objeto JavaScript → HTTP request (salida)

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

### 2.2 HTTP request → objeto Java (entrada al backend)

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

### 2.3 Respuesta HTTP → objeto JavaScript (entrada al navegador)

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

## 3. Endpoints y flujo de cada operación

**Base URL:** `/api/materias` (relativa al origen de la página).

### 3.1 LISTAR — `GET /api/materias`

| Fase | Qué viaja |
|---|---|
| Request | `GET /api/materias` — sin body, sin `Content-Type` |
| Backend | `materiaDAO.findAll()` → `SELECT * FROM materia` |
| Response | `200 OK`, `Content-Type: application/json`, **array** |

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

### 3.2 BUSCAR UNO — `GET /api/materias/{id}`

| Fase | Qué viaja |
|---|---|
| Request | `GET /api/materias/3` — el id va en la **ruta** (path variable) |
| Backend | `materiaDAO.findById(3)` |
| Response | `200 OK` + objeto JSON, **o body vacío** si no existe |

⚠️ **Particularidad:** `findById` devuelve `null` cuando no hay coincidencia
y el controlador no tiene `@ResponseStatus(NOT_FOUND)`, así que la API
responde `200` con el body vacío. El frontend lo detecta en
`app.js:121` (`if (data === null)`) y muestra un aviso.

### 3.3 CREAR — `POST /api/materias`

Flujo completo de la transmisión:

```
1. El usuario rellena el formulario de index.html
2. submit → e.preventDefault()                        (app.js:334)
3. validarFormulario("#formMateria") — Constraint Validation de HTML5
      (el backend NO valida: lo que llegue se persiste tal cual)
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

### 3.4 ACTUALIZAR — `PUT /api/materias`

Mismo body que POST **pero con `idMateria` incluido** (el identificador viaja
dentro del JSON, no en la URL):

```json
{ "idMateria": 3, "nombre": "Álgebra II", "creditos": 6, "horasCatedra": 48, "idProfesor": 1 }
```

El DAO (`MateriaDAOImpl.update`) busca la fila por `idMateria`; si no
existe, `entityManager.merge()` **inserta una fila nueva** (comportamiento
*upsert*). La respuesta es `200 OK` con el objeto reflejado.

Código: `actualizarMateria()` → `app.js:194`.

### 3.5 ELIMINAR — `DELETE /api/materias/{id}`

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

### 3.6 Recurso Profesor — `/api/profesor`

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
| POST | `/api/profesor` | objeto **sin** `idProfesor` | objeto creado (con id) | `"json"` |
| PUT | `/api/profesor` | objeto **con** `idProfesor` | objeto actualizado | `"json"` |
| DELETE | `/api/profesor/{id}` | id en la ruta, sin body | **texto plano** | `"text"` |

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
(HTTP 500) y el registro **no** se elimina. La página lo avisa en el modal.

Código: `listarProfesores()` → `profesores.js:30` · `crearProfesor()` →
`profesores.js:150` · `actualizarProfesor()` → `profesores.js:181` ·
`eliminarProfesor()` → `profesores.js:214` · `verMateriasDeProfesor()` →
`profesores.js` (subrecurso, ver 3.7).

---

### 3.7 Endpoints de relación (subrecurso)

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

## 4. Matriz resumen de la transmisión

| Operación | Verbo | Ruta | Body (request) | Content-Type request | Body (response) | Content-Type response | `dataType` jQuery |
|---|---|---|---|---|---|---|---|
| Listar | GET | `/api/materias` | — | — | array JSON | `application/json` | `"json"` |
| Buscar | GET | `/api/materias/{id}` | — | — | objeto JSON o vacío | `application/json` | `"json"` |
| Crear | POST | `/api/materias` | objeto **sin** `idMateria` | `application/json` | objeto con `idMateria` nuevo | `application/json` | `"json"` |
| Actualizar | PUT | `/api/materias` | objeto **con** `idMateria` | `application/json` | objeto actualizado | `application/json` | `"json"` |
| Eliminar | DELETE | `/api/materias/{id}` | — | — | texto plano | `text/plain` | `"text"` |
| Listar | GET | `/api/profesor` | — | — | array JSON | `application/json` | `"json"` |
| Buscar | GET | `/api/profesor/{id}` | — | — | objeto JSON o vacío | `application/json` | `"json"` |
| Crear | POST | `/api/profesor` | objeto **sin** `idProfesor` | `application/json` | objeto con `idProfesor` nuevo | `application/json` | `"json"` |
| Actualizar | PUT | `/api/profesor` | objeto **con** `idProfesor` | `application/json` | objeto actualizado | `application/json` | `"json"` |
| Eliminar | DELETE | `/api/profesor/{id}` | — | — | texto plano | `text/plain` | `"text"` |
| Profesor de la materia | GET | `/api/materias/{id}/profesor` | — | — | objeto JSON o vacío | `application/json` | `"json"` |
| Materias del profesor | GET | `/api/profesor/{id}/materias` | — | — | array JSON | `application/json` | `"json"` |

---

## 5. Manejo de errores

El backend **no tiene** `@ControllerAdvice` ni `@ExceptionHandler`: los
errores usan el JSON por defecto de Spring Boot:

```json
{
  "timestamp": "2026-10-15T10:00:00.000+00:00",
  "status": 400,
  "error": "Bad Request",
  "path": "/api/materias/abc"
}
```

Situaciones posibles y su comportamiento:

| Causa | HTTP | Cuerpo | Reacción del frontend |
|---|---|---|---|
| JSON malformado / id no numérico | 400 | JSON de error de Spring | `error:` → alerta roja con `mensajeError()` (`common.js:81`) |
| `idProfesor` inexistente al crear materia (violación FK) | 500 | JSON/HTML de error | alerta roja; el registro **no** se crea |
| Borrar profesor con materias asignadas (violación FK) | 500 | JSON/HTML de error | alerta roja; el profesor **no** se elimina |
| Backend caído / puerto cerrado | 0 | — | "No se pudo contactar con la API…" |
| ID inexistente en búsqueda | 200 | body vacío | aviso ámbar "No existe ninguna materia con ID n" |
| ID inexistente en endpoint de relación | 200 | body vacío / `[]` | modal con "sin profesor asignado" / "no imparte materias" |
| DELETE de id inexistente | 200 | texto de éxito igualmente | la API lo trata como no-op (quirirk documentado) |

En todos los casos el detalle también queda impreso en la **consola de
peticiones** de la propia página (bloque final de `index.html`), que muestra
hora, verbo, URL, body enviado y respuesta recibida.

---

## 6. Validación

* **Frontend:** HTML5 Constraint Validation (`required`, `min`, `max`,
  `maxlength`) + `checkValidity()` en `validarFormulario(selector)`
  (`common.js:97`).
* **Backend:** no hay ninguna (`@Valid`/`jakarta.validation` no se usan).
  Cualquier payload JSON que Jackson pueda mapear se persiste sin comprobar
  rangos ni nulos.

---

## 7. Cómo ejecutarlo

### 7.1 Configuración de credenciales (`.env`)

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

### 7.2 Arrancar

```bash
cd profemateria
./mvnw spring-boot:run
```

1. Abrir **<http://localhost:8080/index.html>** (Materias) o
   **<http://localhost:8080/profesores.html>** (Profesores). El HTML está en
   `static/`, servido por la propia aplicación → mismo origen → sin CORS.
2. Cada página carga su listado automáticamente (`GET /api/materias` o
   `GET /api/profesor`).
3. Cada acción de la UI dispara su `$.ajax` y queda registrada en la
   consola de peticiones al final de la página. Se navega entre ambas con la
   barra superior.

Requisitos: MySQL accesible en `host.docker.internal:3306` con la base
`api_rest_spring-boot` (script en `data/generar_base_de_datos.sql`).

---

## 8. Pruebas rápidas con curl (equivalente manual de cada AJAX)

```bash
# LISTAR  → listarMaterias()
curl -s http://localhost:8080/api/materias

# BUSCAR  → buscarPorId()
curl -s http://localhost:8080/api/materias/1

# CREAR   → crearMateria()
curl -s -X POST http://localhost:8080/api/materias \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Álgebra","creditos":6,"horasCatedra":48,"idProfesor":1}'

# EDITAR  → actualizarMateria()
curl -s -X PUT http://localhost:8080/api/materias \
  -H "Content-Type: application/json" \
  -d '{"idMateria":1,"nombre":"Álgebra II","creditos":6,"horasCatedra":48,"idProfesor":1}'

# BORRAR  → eliminarMateria()
curl -s -X DELETE http://localhost:8080/api/materias/1

# ----- Profesores (/api/profesor) -----

# LISTAR  → listarProfesores()
curl -s http://localhost:8080/api/profesor

# BUSCAR  → buscarPorId()
curl -s http://localhost:8080/api/profesor/1

# CREAR   → crearProfesor()
curl -s -X POST http://localhost:8080/api/profesor \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Ana","apellidos":"Gómez","direccion":"Calle 1"}'

# EDITAR  → actualizarProfesor()
curl -s -X PUT http://localhost:8080/api/profesor \
  -H "Content-Type: application/json" \
  -d '{"idProfesor":1,"nombre":"Hubert","apellidos":"Farnsworth","direccion":"Planet Express"}'

# BORRAR  → eliminarProfesor()
curl -s -X DELETE http://localhost:8080/api/profesor/4

# ----- Endpoints de relación (subrecurso) -----

# PROFESOR DE UNA MATERIA  → verProfesorDeMateria()
curl -s http://localhost:8080/api/materias/3/profesor

# MATERIAS DE UN PROFESOR  → verMateriasDeProfesor()
curl -s http://localhost:8080/api/profesor/1/materias
```
