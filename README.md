TrackBuild — Backend (Django)
=========================

Resumen
-------
Aplicación backend para gestión de proyectos de obra: proyectos, compras, entregas, reportes de avance, alertas y generación de reportes (PDF). Diseño modular con servicios, selectores y layer de auditoría (`history`). Autenticación JWT disponible.

Módulos clave (resumen muy breve)
---------------------------------
- projects: CRUD de proyectos, KPIs y hashes de integridad.
- purchases: registro de compras y totales financieros.
- deliveries: registro de entregas y control de stock.
- progress_reports: reportes de avance por proyecto (fuente de avance físico).
- alerts: motor de alertas automáticas y endpoints.
- reporting: generación de PDFs (reportes completos, alertas, financieros).
- users: login/register y autenticación JWT.

Requisitos
---------
- Python 3.11+ (imagen usa 3.12 en Dockerfile)
- PostgreSQL
- Requisitos Python (ver `requirements.txt`)

Configuración rápida (local)
---------------------------
1. Crear y activar un entorno virtual:

```bash
python -m venv .venv
# Windows
.venv\Scripts\activate
# Unix/macOS
source .venv/bin/activate
```

2. Instalar dependencias:

```bash
pip install -r requirements.txt
```

3. Crear archivo de entorno `.env` en la raíz con al menos:

```env
SECRET_KEY=change-me
DEBUG=True
DATABASE_URL=postgres://user:password@localhost:5432/trackdb
```

4. Aplicar migraciones:

```bash
python manage.py migrate
```

5. Crear superusuario (opcional):

```bash
python manage.py createsuperuser
```

6. Ejecutar servidor de desarrollo:

```bash
python manage.py runserver 0.0.0.0:8000
```

Usando Docker (rápido)
----------------------
El proyecto incluye `Dockerfile` y `entrypoint.sh`.

1. Construir la imagen:

```bash
docker build -t track-backend .
```

2. Ejecutar (con PostgreSQL enlazado por `docker-compose` o servicio externo):

```bash
docker run -e DATABASE_URL="postgres://user:pass@db:5432/trackdb" -p 8000:8000 track-backend
```

Nota: `entrypoint.sh` espera a PostgreSQL y aplica migraciones automáticamente.

Autenticación y uso rápido de la API
-----------------------------------
- El backend usa JWT (`rest_framework_simplejwt`) por defecto. Para obtener tokens:
  - `POST /api/auth/login/` → devuelve `access` y `refresh`.
  - `POST /api/auth/refresh/` → renueva el `access` con `refresh`.

Ejemplo: login (curl)

```bash
curl -X POST http://localhost:8000/api/auth/login/ -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"secret"}'
```

Llamadas autenticadas:

```bash
curl -H "Authorization: Bearer <ACCESS_TOKEN>" http://localhost:8000/api/projects/
```


Endpoints útiles
----------------
- `POST /api/auth/login/` — login
- `POST /api/auth/register/` — registro
- `GET /api/projects/` — listar/crear proyectos
- `GET /api/projects/<id>/kpi/` — KPI por proyecto
- `POST /api/progress/` — crear progress report
- `GET /api/reporting/project/<id>/pdf/` — descargar PDF (según rutas)



