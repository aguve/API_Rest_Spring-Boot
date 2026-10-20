# API REST Spring Boot — Profematerias

API REST sencilla de gestión de **materias** y **profesores** construida con
**Spring Boot + Spring Security + JPA + MySQL**, y un frontend en **HTML + Bootstrap + AJAX**
servido por la propia aplicación.

Recursos expuestos:

- `materia` — con una clave foránea `id_profesor` que apunta a `profesor`.
- `profesor` — gestionado por su propio controlador (`/api/profesor`).
- `auth` — sesión de usuario: login, logout, usuario actual y cambio de contraseña.
- `admin` — alta y listado de directores (exclusivo de `ROLE_ADMIN`).

La API está protegida con **sesión (cookie `JSESSIONID`) y roles**
(`ADMIN`, `DIRECTOR`, `PROFESOR`); ver [Seguridad](#3-seguridad-spring-security).

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Lenguaje | Java 21 |
| Framework | Spring Boot (ver `profemateria/pom.xml`) |
| Seguridad | Spring Security (sesión HTTP, BCrypt, roles) |
| Persistencia | Spring Data JPA / Hibernate (`EntityManager`) |
| Base de datos | MySQL 8 |
| Build | Maven Wrapper (`mvnw`) |
| Frontend | HTML5 + Bootstrap 5 + jQuery (AJAX) |

---

## Estructura del proyecto

```
API_Rest_Spring-Boot/
├── data/
│   ├── generar_base_de_datos.sql              # crea la BD, tablas y users/authorities
│   ├── migracion_spring_security.sql          # añade users.password_changed a una BD existente
│   ├── api_rest_spring-boot_profesor.sql      # tabla profesor + datos de ejemplo
│   └── api_rest_spring-boot_materia.sql       # tabla materia  + datos de ejemplo
├── profemateria/
│   ├── .env.example                           # plantilla de variables de entorno
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── src/main/
│       ├── java/com/da/profemateria/
│       │   ├── ProfemateriaApplication.java
│       │   ├── entity/{Materia,Profesor,Usuario}.java
│       │   ├── dao/{Materia,Profesor,Usuario}DAO.java + DAOImpl
│       │   ├── rest/MateriaRestController.java
│       │   ├── rest/ProfesorRestController.java
│       │   ├── rest/AuthRestController.java   # login/logout/me/password
│       │   ├── rest/AdminRestController.java  # alta de directores (ADMIN)
│       │   ├── rest/ApiExceptionHandler.java  # errores 403/400 en JSON
│       │   ├── security/SecurityConfig.java   # reglas por rol + BCrypt
│       │   ├── security/{AppUserDetails,AppUserDetailsService}.java
│       │   ├── security/ForzarCambioPasswordFilter.java
│       │   ├── security/InicializadorAdmin.java
│       │   ├── security/{UsuarioActual,NoAutorizadoException}.java
│       │   └── service/UsuarioService.java
│       └── resources/
│           ├── application.properties         # usa ${DB_*} y app.seguridad.*
│           └── static/                        # frontend
│               ├── login.html                 # acceso (punto de entrada)
│               ├── index.html                 # página de Materias
│               ├── profesores.html            # página de Profesores
│               ├── directores.html            # área del administrador
│               ├── cambiar-password.html      # primer acceso / cambio de clave
│               ├── css/style.css
│               └── js/{common,sesion,login,cambiar-password,
│                       app,profesores,directores}.js
├── DOCUMENTACION_FRONTEND.md
└── README.md
```

---

## Requisitos previos

- **Java 21** (`java -version`)
- **MySQL 8** (local o en Docker)
- No hace falta instalar Maven: se incluye el wrapper `./mvnw`.

---

## 1. Base de datos

Los scripts SQL están en `data/`. Tienes dos caminos:

### Opción A — Esquema + datos de ejemplo (recomendado para probar)

1. Crea la base de datos y las tablas:

   ```bash
   mysql -h 127.0.0.1 -u root -p < data/generar_base_de_datos.sql
   ```

2. Carga los datos de ejemplo. **Respeta el orden** (la FK de `materia`
   apunta a `profesor`):

   ```bash
   mysql -h 127.0.0.1 -u root -p api_rest_spring-boot < data/api_rest_spring-boot_profesor.sql
   mysql -h 127.0.0.1 -u root -p api_rest_spring-boot < data/api_rest_spring-boot_materia.sql
   ```

### Opción B — Solo esquema (sin datos)

```bash
mysql -h 127.0.0.1 -u root -p < data/generar_base_de_datos.sql
```

### Si MySQL corre en Docker

Ejecuta los scripts dentro del contenedor. Ojo: al redirigir el `.sql` por
`stdin`, la opción `-p` sin valor no sirve (leería del propio archivo), así que
indica la contraseña explícitamente:

```bash
docker exec -i <contenedor_mysql> mysql -u root -p'tu_password' < data/generar_base_de_datos.sql
docker exec -i <contenedor_mysql> mysql -u root -p'tu_password' api_rest_spring-boot < data/api_rest_spring-boot_profesor.sql
docker exec -i <contenedor_mysql> mysql -u root -p'tu_password' api_rest_spring-boot < data/api_rest_spring-boot_materia.sql
```

| Script | Qué hace |
|---|---|
| `generar_base_de_datos.sql` | `CREATE DATABASE` + tablas `profesor`, `materia`, `users` y `authorities` |
| `api_rest_spring-boot_profesor.sql` | `DROP` + `CREATE` de `profesor` + 3 profesores de ejemplo |
| `api_rest_spring-boot_materia.sql` | `DROP` + `CREATE` de `materia` + materias de ejemplo |
| `migracion_spring_security.sql` | `ALTER TABLE users ADD password_changed` en una BD **ya existente** |

> **BD ya creada antes de la integración de Spring Security:** ejecuta sólo la
> migración (si creaste la BD con la versión actual de
> `generar_base_de_datos.sql`, la columna ya existe y no hace falta):
>
> ```bash
> mysql -h 127.0.0.1 -u root -p api_rest_spring-boot < data/migracion_spring_security.sql
> ```
>
> Las tablas `users`/`authorities` **no** llevan INSERT del administrador:
> lo crea la propia aplicación al arrancar (bcrypt).

---

## 2. Variables de entorno (`.env`)

Las credenciales **no** se guardan en el repositorio. `application.properties`
solo declara variables y carga un archivo `.env` local (ignorado por git):

```properties
spring.config.import=optional:file:./.env[.properties]
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
server.port=${SERVER_PORT:8080}       # opcional: 8080 si no se define
```

Crea tu `.env` a partir de la plantilla:

```bash
cp profemateria/.env.example profemateria/.env
```

y rellena los valores:

```properties
DB_URL=jdbc:mysql://host.docker.internal:3306/api_rest_spring-boot
DB_USERNAME=root
DB_PASSWORD=tu_password
SERVER_PORT=8080
```

| Variable | Descripción |
|---|---|
| `DB_URL` | URL JDBC de conexión a MySQL. Usa `localhost` si la BD está en tu máquina; `host.docker.internal` si la app corre en Docker y MySQL en el host. |
| `DB_USERNAME` | Usuario de MySQL |
| `DB_PASSWORD` | Contraseña de MySQL |
| `SERVER_PORT` | Puerto HTTP de la API y el frontend (opcional). Si no existe, se usa **8080**. Útil cuando el 8080 está ocupado por otro proceso. |

> Si no quieres usar `.env`, puedes definir estas variables en el
> entorno del sistema (útil en CI/Docker). Si no defines `DB_URL`/`DB_*`, el
> arranque fallará con *"Could not resolve placeholder 'DB_URL'"*;
> `SERVER_PORT`, en cambio, **tiene valor por defecto** (8080) y no hace
> falta definirla.

---

## 3. Seguridad (Spring Security)

La API y el frontend están protegidos por **sesión** (cookie `JSESSIONID`,
se genera al hacer login) con contraseñas cifradas en **BCrypt**.

### Roles

| Rol | Acceso |
|---|---|
| `ROLE_ADMIN` | Sólo `/api/admin/**` (alta y listado de directores). **No** puede tocar materias ni profesores. |
| `ROLE_DIRECTOR` | `/api/materias/**` (todas) y `/api/profesor/**` |
| `ROLE_PROFESOR` | Sólo `/api/materias/**` y sólo **sus** materias (`id_profesor` = su `user_id`); el resto devuelve `403` |

Sin sesión → `401` JSON; rol insuficiente → `403` JSON (ambos los consume el
frontend para redirigir).

### Primer login y usuarios

- El **administrador** (user_id `1000`, contraseña `admin1234`) lo crea la
  propia aplicación al arrancar si no existe ningún `ROLE_ADMIN`
  (`InicializadorAdmin`).
- Los **directores** se dan de alta desde `directores.html` (ADMIN) y los
  **profesores** desde `profesores.html` (DIRECTOR); ambos nacen con la
  contraseña por defecto `1234` y `password_changed = 0`, por lo que
  **deben cambiarla en el primer acceso**: mientras tanto,
  `ForzarCambioPasswordFilter` devuelve `403` con
  `code = "PASSWORD_CHANGE_REQUIRED"` a cualquier otra llamada.
- Ajustes en `application.properties`: `app.seguridad.id-admin`,
  `app.seguridad.password-admin` y `app.seguridad.password-por-defecto`.

### Identificador de acceso (usuario)

- Profesores y directores inician sesión con su **`nombre` + `apellidos`**
  (tal cual figuran en la tabla `profesor`, sin distinguir mayúsculas), o
  alternativamente con su `user_id` numérico.
- El **administrador** (sin fila en `profesor`) entra siempre con su
  `user_id` (`1000`).
- Para evitar suplantaciones, si un `"nombre apellidos"` corresponde a más
  de un profesor el acceso por nombre falla (habría que desambiguar o usar
  el `user_id`).
- Al dar de alta un profesor (DIRECTOR) o un director (ADMIN) se **rechaza**
  el alta si ya existe otro con el mismo `"nombre apellidos"` (sin
  distinguir mayúsculas), sugiriendo añadir un número o un segundo apellido.
  > *Mejora futura:* añadir a `profesor` (y a la BD) un campo `email`
  > `UNIQUE` que sirva de identificador de acceso inequívoco.

### Endpoints de sesión

| Método | Ruta | Descripción | Body | Respuesta |
|---|---|---|---|---|
| POST | `/api/auth/login` | Abre sesión | `{username, password}` (`username`: `"nombre apellidos"` o `user_id`) | Datos de sesión (200) o `401` |
| GET | `/api/auth/me` | Usuario autenticado | — | Datos de sesión o `401` |
| POST | `/api/auth/logout` | Cierra la sesión | — | `{ok: true}` |
| POST | `/api/auth/password` | Cambia la contraseña | `{nuevaPassword}` (≥6 caracteres) | `{ok: true}` o `400`/`401` |
| GET | `/api/admin/directores` | Lista de directores | — | Array JSON (ADMIN) |
| POST | `/api/admin/directores` | Da de alta un director | `{nombre, apellidos, direccion}` | `{profesor, userId, rol, passwordPorDefecto, message}` |

Datos de sesión (respuesta de `login` y `me`):

```json
{
  "userId": 1000,
  "username": "1000",
  "nombreCompleto": "1000",
  "authority": "ROLE_ADMIN",
  "rol": "ADMIN",
  "passwordChanged": false,
  "passwordPorDefecto": "admin1234"
}
```

> ⚠️ Las contraseñas por defecto están pensadas sólo para desarrollo: cámbialas
> (`app.seguridad.*`) o mejor, renueva las de tu BD. No subas credenciales
> reales al repositorio (usa `.env`).

---

## 4. Ejecutar la aplicación

```bash
cd profemateria
./mvnw spring-boot:run          # Linux/macOS
mvnw.cmd spring-boot:run        # Windows
```

La aplicación arranca en **<http://localhost:8080>** (puerto por defecto;
si defines `SERVER_PORT` en `.env` —p. ej. `8088`— sustitúyelo en todas las
URLs):

- **Login (punto de entrada):** <http://localhost:8080/login.html>
- **Materias:** <http://localhost:8080/index.html> — DIRECTOR y PROFESOR
- **Profesores:** <http://localhost:8080/profesores.html> — DIRECTOR
- **Directores:** <http://localhost:8080/directores.html> — ADMIN
- **Cambio de contraseña:** <http://localhost:8080/cambiar-password.html>
- **API:** <http://localhost:8080/api/materias> y <http://localhost:8080/api/profesor>
  (sin sesión responde `401`)

---

## Frontend

El frontend vive en `profemateria/src/main/resources/static/` (lo sirve el
mismo Spring Boot, por lo que no hay problemas de CORS). Todas las páginas
están protegidas: `sesion.js` consulta `GET /api/auth/me` y redirige a
`login.html` si no hay sesión (o a `cambiar-password.html` si aún no se ha
cambiado la contraseña).

| Página | Script | Roles | Contenido |
|---|---|---|---|
| `login.html` | `js/login.js` | público | Acceso (`POST /api/auth/login`) |
| `index.html` | `js/app.js` | DIRECTOR, PROFESOR | Materias |
| `profesores.html` | `js/profesores.js` | DIRECTOR | Profesores |
| `directores.html` | `js/directores.js` | ADMIN | Alta y listado de directores |
| `cambiar-password.html` | `js/cambiar-password.js` | cualquiera | Cambio obligatorio/ voluntario de contraseña |

Compartidos: `js/common.js` (helpers AJAX y redirección global ante `401`/
`403 PASSWORD_CHANGE_REQUIRED`) y `js/sesion.js` (guardia de página, barra de
navegación y logout). La barra superior oculta/enlaza cada opción según el rol
(`data-solo-rol`).

### Materias — `index.html` (`GET /api/materias`)

- Listar todas las materias (un **PROFESOR** sólo ve las suyas)
- Buscar una materia por ID
- Crear (`POST`) y editar (`PUT`) materias desde un formulario
  (al PROFESOR se le oculta el campo *ID Profesor*: se le asigna el suyo)
- Eliminar con confirmación (`DELETE`)
- Ver el **profesor** que imparte la materia (botón *Profesor* → modal;
  `GET /api/materias/{id}/profesor`)

### Profesores — `profesores.html` (`GET /api/profesor`)

- Listar todos los profesores
- Buscar un profesor por ID
- Crear (`POST`) y editar (`PUT`) profesores desde un formulario
  (nombre, apellidos, dirección opcional). El alta crea además el usuario
  `ROLE_PROFESOR` con contraseña por defecto: `userId`, `rol` y
  `passwordPorDefecto` vienen en la respuesta y quedan en la consola de
  peticiones
- Ver las **materias** que imparte el profesor (botón *Materias* → modal;
  `GET /api/profesor/{id}/materias`)
- Eliminar con confirmación (`DELETE`); si el profesor tiene materias
  asignadas, la API responde 500 (clave foránea) y no se elimina. Un
  **DIRECTOR no puede modificarse ni darse de baja** desde esta página
  (`403` JSON)

### Directores — `directores.html` (`GET/POST /api/admin/directores`)

- Listado de usuarios `ROLE_DIRECTOR` con su estado de contraseña
- Alta de director (nombre, apellidos, dirección): crea el profesor + usuario
  `ROLE_DIRECTOR` y muestra la contraseña por defecto en un modal

Todas las páginas incluyen una **consola integrada** que muestra cada petición
AJAX (hora, verbo, URL, body enviado y respuesta recibida).

### `DOCUMENTACION_FRONTEND.md`

El archivo **[`DOCUMENTACION_FRONTEND.md`](DOCUMENTACION_FRONTEND.md)** es la
documentación técnica detallada de **cómo se transmiten los datos** entre el
navegador y la API. Explica, entre otras cosas:

- El flujo de **sesión y roles**: `login.html` → `cambiar-password.html` →
  página del rol, la guardia `Sesion.iniciar()` y la redirección global
  ante `401`/`403`.
- Los endpoints `/api/auth/**` y `/api/admin/**` con sus bodies y respuestas.
- Cómo se serializa el objeto JavaScript a JSON (`JSON.stringify`) y cómo viaja
  en el *body* HTTP con `Content-Type: application/json`.
- Cómo Jackson deserializa el JSON a las entidades `Materia` y `Profesor` (y el
  mapeo exacto de nombres `camelCase` → columnas `snake_case`).
- El flujo petición/respuesta de cada endpoint (GET, POST, PUT, DELETE) de
  ambos recursos, incluyendo el caso especial de `DELETE`, que responde
  **texto plano**.
- La relación `@ManyToOne` entre `Materia` y `Profesor` y cómo el objeto
  `profesor` aparece anidado en el JSON.
- Manejo de errores (400/401/403 en JSON vía `ApiExceptionHandler` y filtros de
  seguridad, y el JSON por defecto de Spring para el resto).
- Ejemplos equivalentes con `curl` (incluida la sesión con cookie).

Si vas a tocar el frontend o a entender el contrato de la API, **empieza por
ese documento**.

---

## API REST

Base URL: `http://localhost:8080/api` (o `http://localhost:<SERVER_PORT>/api`
si has cambiado el puerto en `.env`)

Todas las rutas exigen sesión salvo `/api/auth/login` (y los estáticos).
Sin sesión → `401`; sin el rol adecuado → `403` (JSON, ver
[Seguridad](#3-seguridad-spring-security)).

### Materias — `/api/materias` — `DIRECTOR` y `PROFESOR`

| Método | Ruta | Descripción | Body (request) | Respuesta |
|---|---|---|---|---|
| GET | `/api/materias` | Lista las materias (PROFESOR: sólo las suyas) | — | Array JSON |
| GET | `/api/materias/{id}` | Obtiene una materia por ID | — | Objeto JSON (vacío si no existe) |
| POST | `/api/materias` | Crea una materia (PROFESOR: se autoasigna) | Objeto JSON sin `idMateria`; `idProfesor` obligatorio sólo para DIRECTOR | Objeto creado (con `idMateria`) |
| PUT | `/api/materias` | Actualiza una materia | Objeto JSON con `idMateria`; `idProfesor` obligatorio sólo para DIRECTOR | Objeto actualizado |
| DELETE | `/api/materias/{id}` | Elimina una materia | — | Texto plano |
| GET | `/api/materias/{id}/profesor` | Profesor que imparte la materia | — | Objeto JSON `Profesor` (vacío si no existe) |

### Profesores — `/api/profesor` — sólo `DIRECTOR`

| Método | Ruta | Descripción | Body (request) | Respuesta |
|---|---|---|---|---|
| GET | `/api/profesor` | Lista todos los profesores | — | Array JSON |
| GET | `/api/profesor/{id}` | Obtiene un profesor por ID | — | Objeto JSON (vacío si no existe) |
| POST | `/api/profesor` | Crea un profesor **y su usuario** `ROLE_PROFESOR` | Objeto JSON sin `idProfesor` | `{idProfesor, nombre, apellidos, direccion, userId, rol, passwordPorDefecto, message}` |
| PUT | `/api/profesor` | Actualiza un profesor (no un director) | Objeto JSON con `idProfesor` | Objeto actualizado |
| DELETE | `/api/profesor/{id}` | Elimina un profesor y su usuario | — | Texto plano |
| GET | `/api/profesor/{id}/materias` | Materias que imparte el profesor | — | Array JSON (vacío `[]` si no imparte ninguna) |

### Sesión — `/api/auth` — `login` es público, el resto requiere sesión

| Método | Ruta | Descripción | Body (request) | Respuesta |
|---|---|---|---|---|
| POST | `/api/auth/login` | Abre sesión (rotación de cookie) | `{username, password}` (`username`: `"nombre apellidos"` o `user_id`) | Datos de sesión o `401` |
| GET | `/api/auth/me` | Usuario autenticado | — | Datos de sesión o `401` |
| POST | `/api/auth/logout` | Cierra la sesión | — | `{ok: true, message}` |
| POST | `/api/auth/password` | Cambia la contraseña | `{nuevaPassword}` (≥6) | `{ok: true, message}` o `400` |

### Administración — `/api/admin` — sólo `ADMIN`

| Método | Ruta | Descripción | Body (request) | Respuesta |
|---|---|---|---|---|
| GET | `/api/admin/directores` | Lista de directores con su estado de contraseña | — | Array JSON |
| POST | `/api/admin/directores` | Da de alta un director y su usuario | `{nombre, apellidos, direccion}` | `{profesor, userId, rol, passwordPorDefecto, message}` |

Ejemplo de materia en JSON:

```json
{
  "idMateria": 1,
  "nombre": "Álgebra",
  "creditos": 6,
  "horasCatedra": 48,
  "idProfesor": 1,
  "profesor": { "idProfesor": 1, "nombre": "Hubert", "apellidos": "Farnsworth", "direccion": "Planet Express" }
}
```

> El campo `idProfesor` es el que se envía al crear/actualizar (clave foránea).
> El objeto `profesor` es de **solo lectura**: lo rellena el backend al leer.

Ejemplo de profesor en JSON:

```json
{
  "idProfesor": 1,
  "nombre": "Hubert",
  "apellidos": "Farnsworth",
  "direccion": "Planet Express"
}
```

---

## Notas

- **CORS:** no es necesario en uso normal (frontend y API en el mismo origen).
  Los controladores de materias y profesores incluyen
  `@CrossOrigin(origins = "*")` para permitir abrirlos desde otro origen.
- **Seguridad:** todos los endpoints (salvo `/api/auth/login` y los estáticos)
  exigen sesión y rol; las respuestas `401`/`403` llegan en JSON. Las
  contraseñas se guardan con BCrypt. No subas credenciales reales al
  repositorio (usa `.env`).
- **Validación:** la validación de campos se hace en el frontend (HTML5);
  el backend sólo comprueba reglas de negocio (contraseña ≥ 6 caracteres,
  nombre/apellidos obligatorios en altas, pertenencia de la materia al
  profesor, usuario duplicado...) devolviendo `400`/`403` en JSON. Un
  `idProfesor` inexistente al crear una materia, o borrar un profesor con
  materias asignadas, aún provoca error 500 (violación de clave foránea).
- **Errores:** `ApiExceptionHandler` devuelve `403` (`NoAutorizadoException`)
  y `400` (`IllegalStateException`) como JSON con `message`; el resto de
  errores usan el JSON por defecto de Spring Boot
  (`server.error.include-message=always`).

---

## Documentación

- **[`DOCUMENTACION_FRONTEND.md`](DOCUMENTACION_FRONTEND.md)** — transmisión de
  datos entre el frontend AJAX y la API REST: sesión y roles, contrato de cada
  endpoint, JSON, errores y ejemplos `curl`.
- Scripts SQL en [`data/`](data).
