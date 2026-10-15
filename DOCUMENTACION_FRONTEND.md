# Documentación del Frontend — Transmisión de datos con la API REST

> **Proyecto:** `profemateria` (Spring Boot 4.1.1 · Java 21 · MySQL)
> **Frontend:** HTML + Bootstrap 5 + AJAX (jQuery `$.ajax`)
> **Archivos:**
>
> | Archivo | Ruta | Contenido |
> |---|---|---|
> | `index.html` | `profemateria/src/main/resources/static/index.html` | Vista (tabla, form, búsqueda, modal, consola) |
> | `app.js` | `profemateria/src/main/resources/static/js/app.js` | Toda la lógica AJAX |
> | `style.css` | `profemateria/src/main/resources/static/css/style.css` | Estilos propios |

---

## 1. Arquitectura general

```
┌──────────────────────────────── NAVEGADOR ────────────────────────────────┐
│  index.html (Bootstrap 5)                                                │
│      │                                                                   │
│      │  app.js  →  $.ajax()  (jQuery)                                    │
│      │      · serializa objetos JS a texto JSON   (JSON.stringify)       │
│      │      · envía peticiones HTTP                (XHR)                 │
│      │      · parsea las respuestas a objetos JS  (JSON.parse)           │
└──────┼────────────────────────────────────────────────────────────────────┘
       │  HTTP/1.1  (puerto 8080, mismo origen)
       ▼
┌──────────────────────────── SPRING BOOT ──────────────────────────────────┐
│  MateriaRestController  (/api)                                           │
│      · @RequestBody  → Jackson deserializa JSON  → objeto Materia        │
│      · @ResponseBody → Jackson serializa objeto  → JSON                  │
│           │                                                              │
│           ▼                                                              │
│  MateriaDAO / MateriaDAOImpl  (JPA · EntityManager)                      │
│           │                                                              │
│           ▼                                                              │
│  MySQL  tabla `materia`  (api_rest_spring-boot)                          │
└──────────────────────────────────────────────────────────────────────────┘
```

**Dato clave:** el HTML se sirve desde la **misma** aplicación Spring Boot
(`src/main/resources/static`), así que no hay problema de CORS en el uso
normal. Además se añadió `@CrossOrigin(origins = "*")` en
`MateriaRestController.java:17` para permitir abrir el HTML desde otro
origen (por ejemplo, un servidor de estáticos separado).

---

## 2. Cómo se transmite cada dato

### 2.1 Objeto JavaScript → HTTP request (salida)

En `app.js` la función `serializar()` (`app.js:27`) aplica `JSON.stringify()`:

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

En `$.ajax` eso se controla con tres opciones (`app.js:227-231`):

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
`obtenerDatosDelFormulario()` (`app.js:307`) usa los nombres camelCase
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

Código: `listarMaterias()` → `app.js:84` · render en `renderizarTabla()` → `app.js:117`.

### 3.2 BUSCAR UNO — `GET /api/materias/{id}`

| Fase | Qué viaja |
|---|---|
| Request | `GET /api/materias/3` — el id va en la **ruta** (path variable) |
| Backend | `materiaDAO.findById(3)` |
| Response | `200 OK` + objeto JSON, **o body vacío** si no existe |

⚠️ **Particularidad:** `findById` devuelve `null` cuando no hay coincidencia
y el controlador no tiene `@ResponseStatus(NOT_FOUND)`, así que la API
responde `200` con el body vacío. El frontend lo detecta en
`app.js:159` (`if (data === null)`) y muestra un aviso.

### 3.3 CREAR — `POST /api/materias`

Flujo completo de la transmisión:

```
1. El usuario rellena el formulario de index.html
2. submit → e.preventDefault()                        (app.js:334)
3. validarFormulario()  — Constraint Validation de HTML5
      (el backend NO valida: lo que llegue se persiste tal cual)
4. obtenerDatosDelFormulario() → objeto JS             (app.js:307)
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

Nota: en modo creación se hace `delete datos.idMateria` (`app.js:341`) para
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

Código: `actualizarMateria()` → `app.js:263`.

### 3.5 ELIMINAR — `DELETE /api/materias/{id}`

| Fase | Qué viaja |
|---|---|
| Request | `DELETE /api/materias/3` — id en la ruta, **sin body** |
| Backend | `materiaDAO.delete(3)` → `DELETE FROM materia WHERE id=3` |
| Response | `200 OK` con **texto plano** (`text/plain`), no JSON |

```
Materia eliminada - id: 3
```

Por eso el AJAX declara `dataType: "text"` (`app.js:290`): si se pidiera
`"json"`, jQuery fallaría al hacer `JSON.parse("Materia eliminada - id: 3")`.
La UI abre antes un modal de confirmación (`abrirModalEliminar()` → `app.js:326`).

---

## 4. Matriz resumen de la transmisión

| Operación | Verbo | Ruta | Body (request) | Content-Type request | Body (response) | Content-Type response | `dataType` jQuery |
|---|---|---|---|---|---|---|---|
| Listar | GET | `/api/materias` | — | — | array JSON | `application/json` | `"json"` |
| Buscar | GET | `/api/materias/{id}` | — | — | objeto JSON o vacío | `application/json` | `"json"` |
| Crear | POST | `/api/materias` | objeto **sin** `idMateria` | `application/json` | objeto con `idMateria` nuevo | `application/json` | `"json"` |
| Actualizar | PUT | `/api/materias` | objeto **con** `idMateria` | `application/json` | objeto actualizado | `application/json` | `"json"` |
| Eliminar | DELETE | `/api/materias/{id}` | — | — | texto plano | `text/plain` | `"text"` |

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
| JSON malformado / id no numérico | 400 | JSON de error de Spring | `error:` → alerta roja con `mensajeError()` (`app.js:70`) |
| `idProfesor` inexistente (violación FK) | 500 | JSON/HTML de error | alerta roja; el registro **no** se crea |
| Backend caído / puerto cerrado | 0 | — | "No se pudo contactar con la API…" |
| ID inexistente en búsqueda | 200 | body vacío | aviso ámbar "No existe ninguna materia con ID n" |
| DELETE de id inexistente | 200 | texto de éxito igualmente | la API lo trata como no-op (quirirk documentado) |

En todos los casos el detalle también queda impreso en la **consola de
peticiones** de la propia página (bloque final de `index.html`), que muestra
hora, verbo, URL, body enviado y respuesta recibida.

---

## 6. Validación

* **Frontend:** HTML5 Constraint Validation (`required`, `min`, `max`,
  `maxlength`) + `checkValidity()` en `validarFormulario()` (`app.js:296`).
* **Backend:** no hay ninguna (`@Valid`/`jakarta.validation` no se usan).
  Cualquier payload JSON que Jackson pueda mapear se persiste sin comprobar
  rangos ni nulos.

---

## 7. Cómo ejecutarlo

```bash
cd profemateria
./mvnw spring-boot:run
```

1. Abrir **<http://localhost:8080/index.html>** (el HTML está en `static/`,
   servido por la propia aplicación → mismo origen → sin CORS).
2. La página carga el listado automáticamente (`GET /api/materias`).
3. Cada acción de la UI dispara su `$.ajax` y queda registrada en la
   consola de peticiones al final de la página.

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
```
