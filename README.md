# TrackBuild

TrackBuild es una aplicacion full-stack para la gestion y supervision de proyectos de construccion. El sistema permite administrar proyectos, compras, entregas, avances, documentos, validaciones, alertas, reportes, busqueda e informacion de mercado desde paneles diferenciados para administradores y supervisores.

El proyecto esta dividido en dos aplicaciones principales:

- `Back-end`: API REST desarrollada con Django REST Framework.
- `Front-end`: interfaz web desarrollada con Next.js.

Tambien incluye configuracion Docker para ejecutar la base de datos PostgreSQL/PostGIS, el backend y, opcionalmente, el frontend.

## Objetivo del sistema

El objetivo de TrackBuild es centralizar informacion operativa de proyectos de construccion y permitir que distintos roles consulten, registren, validen y auditen datos importantes del flujo de obra.

Entre sus funciones principales se encuentran:

- Gestion de proyectos.
- Registro de compras y entregas.
- Seguimiento de avances.
- Gestion documental con subida de archivos, versiones e historial.
- Validacion de elementos operativos.
- Alertas del sistema.
- Generacion de reportes PDF.
- Busqueda global con filtros.
- Consulta de informacion de mercado.
- Autenticacion con JWT y login con Google.

## Arquitectura general

La arquitectura esta separada en frontend, backend y base de datos.

```text
Usuario
  |
  v
Frontend Next.js
  |
  v
API REST Django
  |
  v
PostgreSQL/PostGIS
```

El frontend consume la API mediante una capa centralizada ubicada en:

```text
Front-end/src/lib/api/
```

El backend expone los endpoints principales desde:

```text
Back-end/trackbuild/urls.py
```

## Tecnologias utilizadas

### Backend

- Python
- Django 5.2
- Django REST Framework
- SimpleJWT
- PostgreSQL/PostGIS
- django-filter
- django-cors-headers
- google-auth

### Frontend

- Next.js 16
- React 19
- TypeScript
- Radix UI
- Tailwind/CSS modular del proyecto
- `@react-oauth/google`

### Infraestructura local

- Docker
- Docker Compose
- PostgreSQL/PostGIS

## Modulos principales

| Modulo | Descripcion |
|---|---|
| Auth | Login tradicional, login con Google, refresh, logout y usuario actual. |
| Projects | Creacion, edicion, consulta y KPIs de proyectos. |
| Purchases | Registro y consulta de compras asociadas a proyectos. |
| Deliveries | Registro y seguimiento de entregas. |
| Progress | Reportes de avance de obra. |
| Documents | Gestion documental, subida de archivos, versiones e historial. |
| Validation | Aprobacion o rechazo de elementos pendientes. |
| Alerts | Consulta y resolucion de alertas. |
| Reporting | Generacion de reportes PDF. |
| Search | Busqueda global con filtros avanzados. |
| Market | Consulta de precios/materiales de referencia. |
| History | Historial y trazabilidad de cambios. |

## Roles del sistema

El sistema contempla dos roles principales:

| Rol | Permisos generales |
|---|---|
| Admin | Puede crear, editar, eliminar y consultar recursos criticos. |
| Supervisor | Puede consultar informacion y participar en flujos de validacion/supervision. |

La seguridad real se aplica en el backend mediante permisos de Django REST Framework. El frontend separa las vistas por rol, pero las restricciones importantes se validan siempre en la API.

## Autenticacion

TrackBuild usa autenticacion basada en JWT.

Flujo tradicional:

```text
POST /api/auth/login/
  -> user
  -> access
  -> refresh
```

El frontend guarda los tokens y usa el access token en las peticiones protegidas. Si el access token expira, intenta renovar sesion con:

```text
POST /api/auth/refresh/
```

El logout envia el refresh token al backend para invalidarlo:

```text
POST /api/auth/logout/
```

Tambien existe login con Google mediante Google Identity Services. El frontend obtiene un `id_token` y lo envia al backend:

```text
POST /api/auth/google/
```

El backend valida el token de Google y emite los JWT internos del sistema.

## Estructura del proyecto

```text
track/
  Back-end/
    alerts/
    deliveries/
    documents/
    history/
    market/
    progress_reports/
    projects/
    purchases/
    reporting/
    search/
    trackbuild/
    users/
    validation/
    Dockerfile
    requirements.txt
    .env.example

  Front-end/
    app/
      admin/
      supervisor/
      login/
      register/
    src/
      lib/
        api/
        auth/
    Dockerfile
    package.json
    .env.example

  docker-compose.yml
  .env.example
```

## Variables de entorno

El proyecto incluye archivos de ejemplo para configurar el entorno local:

```text
.env.example
Back-end/.env.example
Front-end/.env.example
```

Para ejecutar localmente, copia los ejemplos y ajusta los valores:

```powershell
Copy-Item .env.example .env
Copy-Item Back-end/.env.example Back-end/.env
Copy-Item Front-end/.env.example Front-end/.env.local
```

Variables importantes:

| Variable | Uso |
|---|---|
| `SECRET_KEY` | Clave secreta de Django. |
| `DEBUG` | Activa/desactiva modo desarrollo. |
| `DATABASE_URL` | Conexion a PostgreSQL. |
| `POSTGRES_DB` | Nombre de la base de datos. |
| `POSTGRES_USER` | Usuario de PostgreSQL. |
| `POSTGRES_PASSWORD` | Password de PostgreSQL. |
| `ALLOWED_HOSTS` | Hosts permitidos por Django. |
| `CORS_ALLOWED_ORIGINS` | Origenes permitidos para el frontend. |
| `GOOGLE_CLIENT_ID` | Client ID de Google para backend. |
| `NEXT_PUBLIC_API_URL` | URL publica del backend para frontend. |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Client ID de Google para frontend. |

## Ejecucion con Docker

Para levantar base de datos y backend:

```powershell
docker compose up --build
```

El backend queda disponible por defecto en:

```text
http://localhost:8081
```

Para levantar tambien el frontend usando el perfil configurado:

```powershell
docker compose --profile frontend up --build
```

El frontend queda disponible por defecto en:

```text
http://localhost:3000
```

## Ejecucion manual del backend

Desde `Back-end`:

```powershell
cd Back-end
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

## Ejecucion manual del frontend

Desde `Front-end`:

```powershell
cd Front-end
npm install
npm run dev
```

La aplicacion quedara disponible en:

```text
http://localhost:3000
```

## Endpoints principales

| Modulo | Endpoint base |
|---|---|
| Auth | `/api/auth/` |
| Projects | `/api/projects/` |
| Purchases | `/api/purchases/` |
| Deliveries | `/api/deliveries/` |
| Progress | `/api/progress/` |
| Documents | `/api/documents/` |
| Validation | `/api/validation/` |
| Alerts | `/api/alerts/` |
| History | `/api/history/` |
| Market | `/api/market/` |
| Reporting | `/api/reporting/` |
| Search | `/api/search/` |

## Pruebas

El backend incluye pruebas para autenticacion, permisos y contratos funcionales.

Con Docker:

```powershell
docker compose exec backend python manage.py test
```

El frontend puede verificarse con:

```powershell
npm run build
```

## Documentacion adicional

El repositorio contiene documentos de apoyo generados durante el desarrollo y auditoria del sistema, entre ellos:

- Manual de usuario.
- Auditorias de autenticacion.
- Auditorias frontend/backend.
- Reportes de fixes.
- Preguntas tecnicas para exposicion.

## Consideraciones de seguridad

- El backend usa JWT para proteger la API.
- Los permisos por rol se validan en backend.
- El refresh token se invalida durante logout.
- CORS se configura mediante variables de entorno.
- Los archivos `.env.example` no deben contener secretos reales.
- Para produccion se recomienda usar `DEBUG=False`, secretos seguros, HTTPS y una politica CORS restrictiva.

## Estado general

TrackBuild esta preparado como sistema full-stack funcional para demostracion local, con backend API, frontend web, autenticacion, roles, modulos operativos y despliegue mediante Docker.

