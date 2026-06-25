# Auditoria de autenticacion: JWT, OAuth y Google Login

## 1. Resumen del estado actual

### Tipo de autenticacion actual

El backend usa JWT con `djangorestframework_simplejwt` como mecanismo principal de autenticacion para la API DRF.

La configuracion global esta en `trackbuild/settings.py`:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
}
```

Esto significa que DRF intenta autenticar requests usando el header:

```http
Authorization: Bearer <access_token>
```

Importante: tener `JWTAuthentication` configurado no obliga automaticamente a que todos los endpoints requieran login. Para eso se necesita `permission_classes = [IsAuthenticated]` en cada vista o un `DEFAULT_PERMISSION_CLASSES` global.

### Librerias usadas

Dependencias relevantes encontradas en `requirements.txt`:

- `djangorestframework==3.16.1`
- `djangorestframework_simplejwt==5.5.1`
- `PyJWT==2.10.1`
- `django-cors-headers==4.9.0`

No se encontraron librerias OAuth o Google Login instaladas actualmente, como:

- `google-auth`
- `django-allauth`
- `dj-rest-auth`
- `social-auth-app-django`

### Modelo de usuario

El proyecto usa un usuario personalizado:

```python
AUTH_USER_MODEL = "users.User"
```

El modelo esta en `users/models.py` y hereda de `AbstractUser`.

Campos relevantes:

- `username`
- `email`
- `password`
- `role`
- `digital_signature`

Roles definidos actualmente en el modelo:

```python
ROLE_CHOICES = (
    ("admin", "Admin"),
    ("supervisor", "Supervisor"),
)
```

El campo `digital_signature` se genera automaticamente usando:

```python
base = f"{self.username}|{self.email}"
```

Esto implica que el usuario interno no solo sirve para login, sino tambien para auditoria, validaciones, documentos y reportes.

### Manejo de roles y permisos

Los permisos personalizados estan en `users/permissions.py`.

Permisos encontrados:

- `IsAdminRole`
- `IsSupervisorRole`
- `IsAdminOrSupervisor`

Estos permisos dependen directamente de:

```python
request.user.role
```

Ejemplo:

```python
return request.user.is_authenticated and request.user.role == "admin"
```

Tambien existe logica de validacion en `validation/services.py` que acepta estos roles:

```python
ALLOWED_ROLES = ("supervisor", "auditor", "contador", "admin")
```

Hay una inconsistencia tecnica: el modelo `User` solo permite `admin` y `supervisor`, pero el modulo de validacion menciona `auditor` y `contador`.

### Endpoints de login, register y refresh

Endpoints principales en `users/urls.py`:

- `POST /api/auth/login/`
- `POST /api/auth/register/`
- `GET /api/auth/me/`
- `POST /api/auth/refresh/`

Tambien existen endpoints JWT duplicados en `trackbuild/urls.py`:

- `POST /api/token/`
- `POST /api/token/refresh/`

El login propio esta implementado en `users/views.py`:

```python
user = authenticate(username=username, password=password)
refresh = RefreshToken.for_user(user)
```

La respuesta devuelve:

```json
{
  "user": {},
  "access": "...",
  "refresh": "..."
}
```

No se encontro un endpoint de logout o revocacion de refresh tokens para JWT.

## 2. Diagnostico tecnico

### Que partes dependen de JWT

JWT se usa principalmente como mecanismo de transporte de identidad entre frontend y backend.

Dependen de JWT:

- `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`
- `LoginView`
- `RegisterView`
- `MeView`
- `TokenRefreshView`
- Endpoints que usan `IsAuthenticated`
- Frontend, si actualmente guarda y envia `access` y `refresh`

JWT no parece estar profundamente acoplado a reglas de negocio. Su rol principal es convertir un token Bearer en `request.user`.

### Que partes dependen del usuario interno

Muchas partes importantes dependen del usuario interno `users.User`, no de JWT directamente.

Ejemplos:

- Auditoria con `log_action(user=...)`
- Campos `created_by`
- Campos `updated_by`
- Campos `uploaded_by`
- Validadores en `ValidationRecord`
- `validator_role`
- `digital_signature`
- Permisos por `request.user.role`
- Regla de no auto-validacion

En `validation/services.py` se compara el usuario autenticado contra el creador del registro:

```python
if created_by == user or created_by_id == user.id:
    raise PermissionDenied(...)
```

Esto confirma que el backend necesita mantener un usuario local aunque el login venga desde Google.

### Que partes podrian romperse si se elimina JWT

Si se elimina JWT completamente, podrian romperse:

- El frontend actual si consume `access` y `refresh`.
- `GET /api/auth/me/`.
- Endpoints con `IsAuthenticated`.
- Flujo de refresh.
- Cualquier request que dependa de `Authorization: Bearer`.
- Auditoria y validaciones si OAuth no se transforma correctamente en un `request.user` local.

Eliminar JWT obligaria a reemplazar el mecanismo por:

- sesiones Django;
- autenticacion propia contra Google en cada request;
- introspeccion de tokens;
- o middleware/API gateway externo.

Eso seria mas invasivo para este proyecto.

### Que partes serian faciles de adaptar a OAuth

La parte mas facil de adaptar es el login inicial.

Google Login puede integrarse asi:

1. El frontend obtiene un `id_token` de Google.
2. El backend valida ese `id_token`.
3. El backend busca o crea un `users.User`.
4. El backend asigna un `role` interno.
5. El backend emite los mismos JWT actuales con `RefreshToken.for_user(user)`.

Esto mantiene intacta la mayoria de la arquitectura actual.

## 3. Comparacion de opciones

| Opcion | Viabilidad | Cambios necesarios | Riesgo | Ventajas | Desventajas | Recomendacion |
|---|---:|---|---|---|---|---|
| Solo JWT | Alta | Corregir permisos globales, agregar logout/revocacion, restringir CORS, revisar registro publico | Medio | Ya funciona, pocos cambios, compatible con frontend | No ofrece Google Login, mantiene passwords propios | Buena base, pero no cumple el objetivo de OAuth |
| Solo OAuth | Baja/Media | Reescribir autenticacion DRF, reemplazar flujo de tokens, mapear Google a `request.user` en cada request | Alto | Reduce dependencia del login con password propio | Rompe frontend y arquitectura API, no reemplaza roles internos | No conviene para este backend |
| OAuth + JWT | Alta | Agregar endpoint Google, validar token, crear/vincular usuario local, emitir JWT actual | Medio/Bajo | Agrega Google Login sin romper permisos, auditoria ni frontend | Requiere manejar duplicados, emails verificados y roles | Mejor opcion |

## 4. Recomendacion final

La recomendacion es:

## Usar OAuth + JWT

Justificacion:

- JWT no esta profundamente acoplado a la logica de negocio.
- La logica importante depende del usuario interno `users.User`.
- El backend ya espera `request.user` en auditoria, documentos, validaciones, compras, entregas y reportes.
- Google OAuth no reemplaza los roles internos del sistema.
- El frontend probablemente ya esta preparado para recibir `access` y `refresh`.
- OAuth + JWT permite agregar Google Login sin romper el contrato actual de la API.

La arquitectura recomendada es:

```text
Google OAuth valida identidad
        |
        v
Backend busca/crea User interno
        |
        v
Backend asigna role interno
        |
        v
Backend emite access/refresh JWT
        |
        v
Frontend consume la API igual que hoy
```

Google debe ser una puerta de entrada al usuario interno, no un reemplazo del sistema de autorizacion.

## 5. Plan de implementacion para OAuth + JWT

### Nuevos endpoints necesarios

Agregar un endpoint:

```http
POST /api/auth/google/
```

Body sugerido:

```json
{
  "id_token": "GOOGLE_ID_TOKEN"
}
```

Respuesta compatible con el login actual:

```json
{
  "user": {
    "id": 1,
    "username": "usuario",
    "email": "usuario@example.com",
    "role": "supervisor",
    "digital_signature": "..."
  },
  "access": "...",
  "refresh": "..."
}
```

Opcionalmente agregar:

```http
POST /api/auth/logout/
```

Para revocar refresh tokens usando blacklist de SimpleJWT.

### Librerias a instalar

Opcion simple recomendada:

```text
google-auth
```

Esta opcion permite validar el `id_token` de Google directamente en un endpoint propio.

Opcion mas completa:

```text
django-allauth
dj-rest-auth
```

Para este backend, la opcion simple parece mas adecuada porque el sistema ya tiene un flujo JWT propio y una respuesta de login definida.

### Cambios en settings.py

Agregar variables de configuracion:

```python
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
```

Recomendado agregar permisos globales:

```python
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}
```

Luego marcar explicitamente como publicos:

- `LoginView`
- `RegisterView`
- `GoogleLoginView`

Tambien se recomienda revisar CORS:

```python
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
]
```

Actualmente existe:

```python
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
```

Esa combinacion es riesgosa.

### Cambios en modelos

Opciones:

1. Hacer `email` unico en `User`.
2. Crear un modelo `SocialAccount`.

Modelo sugerido:

```python
class SocialAccount(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    provider = models.CharField(max_length=50)
    provider_user_id = models.CharField(max_length=255)
    email = models.EmailField()

    class Meta:
        unique_together = ("provider", "provider_user_id")
```

Si se quiere mantener simple, se puede empezar buscando por email, pero lo mas robusto es guardar el `sub` de Google como identificador estable.

### Flujo recomendado para login con Google

1. Frontend abre Google Login.
2. Google devuelve un `id_token`.
3. Frontend envia el `id_token` a:

```http
POST /api/auth/google/
```

4. Backend valida:

- firma del token;
- `aud` contra `GOOGLE_CLIENT_ID`;
- issuer;
- expiracion;
- `email_verified`;
- `sub`;
- `email`.

5. Backend busca usuario local:

- primero por `SocialAccount(provider="google", provider_user_id=sub)`;
- si no existe, por email;
- si no existe, crea usuario nuevo.

6. Backend asigna rol interno.
7. Backend genera JWT con:

```python
refresh = RefreshToken.for_user(user)
```

8. Backend responde igual que `/api/auth/login/`.

### Como asignar roles a usuarios OAuth

No se debe confiar en Google para asignar roles internos.

Opciones seguras:

- asignar `supervisor` por defecto;
- crear usuario con rol `pending` y requerir aprobacion de admin;
- usar whitelist de emails;
- usar dominio corporativo;
- mapear roles por una tabla interna;
- crear invitaciones previas.

Para este backend, lo mas seguro seria:

1. Agregar rol `pending`, o usar `is_active=False` hasta aprobacion.
2. Permitir que un admin asigne `admin` o `supervisor`.
3. Evitar que el frontend envie el `role` durante Google Login.

### Como mantener compatibilidad con el frontend

El endpoint Google debe devolver la misma forma de respuesta que el login actual:

```json
{
  "user": {},
  "access": "...",
  "refresh": "..."
}
```

Asi el frontend solo necesita agregar un boton de Google Login. El resto de llamadas siguen usando:

```http
Authorization: Bearer <access_token>
```

## 6. Riesgos y seguridad

### Validacion del token de Google

Riesgo: aceptar tokens falsos o emitidos para otro cliente.

Mitigacion:

- usar `google-auth`;
- validar `aud` contra `GOOGLE_CLIENT_ID`;
- validar issuer;
- validar expiracion;
- exigir `email_verified=True`;
- usar `sub` como identificador estable.

### Manejo de refresh tokens

Riesgo: los refresh tokens actuales duran 7 dias y no se encontro revocacion.

Mitigacion:

- activar blacklist de SimpleJWT;
- agregar endpoint de logout;
- considerar rotacion de refresh tokens;
- reducir lifetime si el sistema maneja informacion sensible.

### Usuarios duplicados por email

Riesgo: `RegisterSerializer` valida emails duplicados, pero el modelo no parece forzar unicidad a nivel de base de datos.

Mitigacion:

- hacer `email` unico;
- usar transacciones;
- usar `get_or_create` con restricciones reales;
- guardar `provider_user_id` de Google.

### Correos no verificados

Riesgo: permitir acceso a cuentas Google con email no verificado.

Mitigacion:

- rechazar tokens con `email_verified=False`.

### Roles por defecto

Riesgo critico: el registro publico actual permite enviar `role`, incluyendo `admin`.

Mitigacion:

- no permitir que usuarios publicos elijan rol;
- asignar rol por backend;
- aprobar usuarios manualmente;
- revisar `RegisterView`.

### CORS y CSRF

Riesgo: CORS esta demasiado abierto.

Configuracion actual riesgosa:

```python
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
```

Mitigacion:

- restringir origenes;
- si se usan cookies, configurar CSRF correctamente;
- si se usan Bearer tokens, evitar cookies innecesarias.

### Expiracion de tokens

Configuracion actual:

```python
ACCESS_TOKEN_LIFETIME = timedelta(hours=3)
REFRESH_TOKEN_LIFETIME = timedelta(days=7)
```

Riesgo: access token de 3 horas puede ser largo para un sistema con auditoria, documentos y validaciones.

Mitigacion:

- access token de 15 a 60 minutos;
- refresh token de 7 dias puede mantenerse si hay blacklist/rotacion.

### Revocacion y logout

Riesgo: no se encontro logout JWT real.

Mitigacion:

- instalar y activar `rest_framework_simplejwt.token_blacklist`;
- crear endpoint `POST /api/auth/logout/`;
- revocar refresh token en logout;
- mantener access tokens con vida corta.

## Conclusion

La mejor arquitectura para este backend es OAuth + JWT.

Google OAuth debe usarse para autenticar la identidad del usuario, pero el backend debe conservar:

- `users.User`;
- roles internos;
- permisos por `request.user.role`;
- auditoria;
- firmas digitales;
- relaciones `created_by`, `updated_by`, `uploaded_by`;
- validaciones internas.

La integracion ideal agrega Google Login como metodo adicional de entrada y mantiene los JWT actuales para consumir la API.
