# API REST Spring Boot — Profematerias

API REST sencilla de gestión de **materias** y **profesores** construida con
**Spring Boot + JPA + MySQL**, y un frontend en **HTML + Bootstrap + AJAX**
servido por la propia aplicación.

Recursos expuestos:

- `materia` — con una clave foránea `id_profesor` que apunta a `profesor`.
- `profesor` — gestionado por su propio controlador (`/api/profesor`).

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Lenguaje | Java 21 |
| Framework | Spring Boot (ver `profemateria/pom.xml`) |
| Persistencia | Spring Data JPA / Hibernate (`EntityManager`) |
| Base de datos | MySQL 8 |
| Build | Maven Wrapper (`mvnw`) |
| Frontend | HTML5 + Bootstrap 5 + jQuery (AJAX) |

---

## Estructura del proyecto

```
API_Rest_Spring-Boot/
├── data/
│   ├── generar_base_de_datos.sql              # crea la BD y las tablas (vacías)
│   ├── api_rest_spring-boot_profesor.sql      # tabla profesor + datos de ejemplo
│   └── api_rest_spring-boot_materia.sql       # tabla materia  + datos de ejemplo
├── profemateria/
│   ├── .env.example                           # plantilla de variables de entorno
│   ├── pom.xml
│   ├── mvnw / mvnw.cmd
│   └── src/main/
│       ├── java/com/da/profemateria/
│       │   ├── ProfemateriaApplication.java
│       │   ├── entity/Materia.java            # @ManyToOne -> Profesor (FK)
│       │   ├── entity/Profesor.java
│       │   ├── dao/MateriaDAO.java
│       │   ├── dao/MateriaDAOImpl.java
│       │   ├── dao/ProfesorDAO.java
│       │   ├── dao/ProfesorDAOImpl.java
│       │   ├── rest/MateriaRestController.java
│       │   └── rest/ProfesorRestController.java
│       └── resources/
│           ├── application.properties         # usa variables ${DB_*}
│           └── static/                        # frontend
│               ├── index.html                 # página de Materias
│               ├── profesores.html            # página de Profesores
│               ├── css/style.css
│               └── js/{app.js, profesores.js, common.js}
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
| `generar_base_de_datos.sql` | `CREATE DATABASE` + tablas `profesor` y `materia` (con la FK) |
| `api_rest_spring-boot_profesor.sql` | `DROP` + `CREATE` de `profesor` + 3 profesores de ejemplo |
| `api_rest_spring-boot_materia.sql` | `DROP` + `CREATE` de `materia` + materias de ejemplo |

---

## 2. Variables de entorno (`.env`)

Las credenciales **no** se guardan en el repositorio. `application.properties`
solo declara variables y carga un archivo `.env` local (ignorado por git):

```properties
spring.config.import=optional:file:./.env[.properties]
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
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
```

| Variable | Descripción |
|---|---|
| `DB_URL` | URL JDBC de conexión a MySQL. Usa `localhost` si la BD está en tu máquina; `host.docker.internal` si la app corre en Docker y MySQL en el host. |
| `DB_USERNAME` | Usuario de MySQL |
| `DB_PASSWORD` | Contraseña de MySQL |

> Si no quieres usar `.env`, puedes definir estas tres variables en el
> entorno del sistema (útil en CI/Docker). Si no defines ninguna, el arranque
> fallará con *"Could not resolve placeholder 'DB_URL'"*.

---

## 3. Ejecutar la aplicación

```bash
cd profemateria
./mvnw spring-boot:run          # Linux/macOS
mvnw.cmd spring-boot:run        # Windows
```

La aplicación arranca en **<http://localhost:8080>**.

- **Frontend Materias:** <http://localhost:8080/index.html>
- **Frontend Profesores:** <http://localhost:8080/profesores.html>
- **API:** <http://localhost:8080/api/materias> y <http://localhost:8080/api/profesor>

---

## Frontend

El frontend vive en `profemateria/src/main/resources/static/` (lo sirve el
mismo Spring Boot, por lo que no hay problemas de CORS). Tiene **dos páginas**
enlazadas por la barra de navegación superior:

### Materias — `index.html` (`GET /api/materias`)

- Listar todas las materias
- Buscar una materia por ID
- Crear (`POST`) y editar (`PUT`) materias desde un formulario
- Eliminar con confirmación (`DELETE`)
- Ver el **profesor** que imparte la materia (botón *Profesor* → modal;
  `GET /api/materias/{id}/profesor`)

### Profesores — `profesores.html` (`GET /api/profesor`)

- Listar todos los profesores
- Buscar un profesor por ID
- Crear (`POST`) y editar (`PUT`) profesores desde un formulario
  (nombre, apellidos, dirección opcional)
- Ver las **materias** que imparte el profesor (botón *Materias* → modal;
  `GET /api/profesor/{id}/materias`)
- Eliminar con confirmación (`DELETE`); si el profesor tiene materias
  asignadas, la API responde 500 (clave foránea) y no se elimina

Ambas páginas incluyen una **consola integrada** que muestra cada petición
AJAX (hora, verbo, URL, body enviado y respuesta recibida).

### `DOCUMENTACION_FRONTEND.md`

El archivo **[`DOCUMENTACION_FRONTEND.md`](DOCUMENTACION_FRONTEND.md)** es la
documentación técnica detallada de **cómo se transmiten los datos** entre el
navegador y la API. Explica, entre otras cosas:

- Cómo se serializa el objeto JavaScript a JSON (`JSON.stringify`) y cómo viaja
  en el *body* HTTP con `Content-Type: application/json`.
- Cómo Jackson deserializa el JSON a las entidades `Materia` y `Profesor` (y el
  mapeo exacto de nombres `camelCase` → columnas `snake_case`).
- El flujo petición/respuesta de cada endpoint (GET, POST, PUT, DELETE) de
  ambos recursos, incluyendo el caso especial de `DELETE`, que responde
  **texto plano**.
- La relación `@ManyToOne` entre `Materia` y `Profesor` y cómo el objeto
  `profesor` aparece anidado en el JSON.
- Manejo de errores (códigos HTTP y JSON de error por defecto de Spring).
- Ejemplos equivalentes con `curl`.

Si vas a tocar el frontend o a entender el contrato de la API, **empieza por
ese documento**.

---

## API REST

Base URL: `http://localhost:8080/api`

### Materias — `/api/materias`

| Método | Ruta | Descripción | Body (request) | Respuesta |
|---|---|---|---|---|
| GET | `/api/materias` | Lista todas las materias | — | Array JSON |
| GET | `/api/materias/{id}` | Obtiene una materia por ID | — | Objeto JSON (vacío si no existe) |
| POST | `/api/materias` | Crea una materia | Objeto JSON sin `idMateria` | Objeto creado (con `idMateria`) |
| PUT | `/api/materias` | Actualiza una materia | Objeto JSON con `idMateria` | Objeto actualizado |
| DELETE | `/api/materias/{id}` | Elimina una materia | — | Texto plano |
| GET | `/api/materias/{id}/profesor` | Profesor que imparte la materia | — | Objeto JSON `Profesor` (vacío si no existe) |

### Profesores — `/api/profesor`

| Método | Ruta | Descripción | Body (request) | Respuesta |
|---|---|---|---|---|
| GET | `/api/profesor` | Lista todos los profesores | — | Array JSON |
| GET | `/api/profesor/{id}` | Obtiene un profesor por ID | — | Objeto JSON (vacío si no existe) |
| POST | `/api/profesor` | Crea un profesor | Objeto JSON sin `idProfesor` | Objeto creado (con `idProfesor`) |
| PUT | `/api/profesor` | Actualiza un profesor | Objeto JSON con `idProfesor` | Objeto actualizado |
| DELETE | `/api/profesor/{id}` | Elimina un profesor | — | Texto plano |
| GET | `/api/profesor/{id}/materias` | Materias que imparte el profesor | — | Array JSON (vacío `[]` si no imparte ninguna) |

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
  Ambos controladores incluyen `@CrossOrigin(origins = "*")` para permitir
  abrirlos desde otro origen.
- **Seguridad:** la API no tiene autenticación; todos los endpoints son
  públicos. No subas credenciales reales al repositorio (usa `.env`).
- **Validación:** el backend no valida los datos; la validación se hace en el
  formulario del frontend (HTML5). Un `idProfesor` inexistente al crear una
  materia, o borrar un profesor con materias asignadas, provoca error 500
  (violación de clave foránea).

---

## Documentación

- **[`DOCUMENTACION_FRONTEND.md`](DOCUMENTACION_FRONTEND.md)** — transmisión de
  datos entre el frontend AJAX y la API REST (contrato, JSON, errores, ejemplos).
- Scripts SQL en [`data/`](data).
