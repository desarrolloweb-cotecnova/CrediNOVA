# Estado de la migración a infraestructura propia

Última actualización: 2026-07-27 (sesión de Claude Code, ejecutada vía
Management API de Supabase y API de Vercel).

## Infraestructura activa

| Pieza | Valor |
| --- | --- |
| Proyecto Supabase | `CrediNOVA` — ref **`ufsfugrwlujelofodnlt`** (org Cotecnova, plan free, región us-west-2) |
| URL Supabase | `https://ufsfugrwlujelofodnlt.supabase.co` |
| Proyecto Vercel | `credinova` (`prj_z6quJ204YavFWovPofxNmvOYLdrQ`, team `credinova-3371`) |
| **URL de producción** | **https://credinova.cotecnova.edu.co** (CNAME desde DigitalOcean) |
| URL alterna de Vercel | https://credinova-henna.vercel.app (activa como respaldo) |

> Se decidió **reusar** el proyecto Supabase `CrediNOVA` ya existente (estaba
> vacío) en lugar de crear `credinova-prod`; por eso la región es us-west-2.

## Base de datos

- **35 migraciones** aplicadas en orden. Tres se corrigieron durante la
  migración porque estaban rotas para instalaciones desde cero:
  - `00005`: la política de `credit_study_costs` referenciaba una columna
    `is_active` inexistente, y la sección de `internal_users` no era idempotente.
  - `00015`: `COMMENT ON SCHEMA storage` exigía ser owner del esquema.
  - `00034` (nueva): elimina los tres usuarios que `00004` sembraba con
    contraseña. No eran inertes: al insertarlos por SQL quedaban con `NULL` en
    las columnas de token de `auth.users`, y GoTrue las lee como texto no nulo,
    devolviendo HTTP 500 (`converting NULL to string is unsupported`) en el
    login con Google y al intentar borrarlos. **Nunca siembres usuarios en
    `auth.users` por SQL sin poner `''` en esas columnas.**
  - `00035` (nueva): función `update_my_full_name()` para que cada usuario
    edite su propio nombre sin poder alterar su rol ni su estado.
- RLS activo en las 11 tablas públicas. `application_documents` **no existe a
  propósito** (`00014` la elimina).
- Bucket `public-documents` con sus políticas.
- `pg_cron` con el job `supabase-keepalive` (cada 3 días, 06:00 UTC).

## Datos migrados desde Medo (export del 27-07-2026)

| Tabla | Filas | Verificación |
| --- | --- | --- |
| `academic_programs` | 15 | ✅ |
| `applications` | 18 | ✅ 0 diferencias (18 × 95 campos) |
| `application_verifications` | 50 | ✅ 0 diferencias |
| `application_status_history` | 31 | ✅ 0 diferencias |

La verificación fue campo por campo contra los CSV de origen, no por conteo.
Integridad referencial completa: 0 huérfanos y 0 registros sin autor.

- Las 81 acciones históricas (50 verificaciones + 31 cambios de estado) se
  atribuyeron a `creditoycartera@cotecnova.edu.co`, que sustituye al usuario
  `7ff79a03-…` del sistema anterior.
- Correcciones acordadas y aplicadas: año `12026`→`2026` en la 3.ª cuota de
  **3QRVGE**; fecha `2016-06-30`→`2026-06-30` en **A7N2PP**.
- Pendiente de revisión del gestor: el recibo de **78FY9Y** trae `18/06/2026`
  en el campo de número de recibo (se dejó tal cual).

## Autenticación

- Acceso **solo con Google**; proveedor Email deshabilitado.
- TOTP (Google Authenticator) obligatorio para entrar al panel.
- Site URL y Redirect URLs apuntando a `credinova.cotecnova.edu.co`, con el
  dominio de Vercel y `localhost:5173` como alternativas.
- El URI de Google Cloud Console **no depende del dominio**: es
  `https://ufsfugrwlujelofodnlt.supabase.co/auth/v1/callback` y no cambia
  aunque se cambie el dominio del frontend.
- Las cuentas nuevas nacen inactivas y ven la pantalla "Tu cuenta está
  pendiente"; el 2FA se configura cuando un administrador las activa.

## Checklist de pasos manuales pendientes

1. **Secrets de las Edge Functions** (Supabase → Edge Functions → Secrets):
   `BREVO_API_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`. Sin ellos
   `send-otp` y `send-email*` fallan.
2. **Conectar GitHub con Vercel**: la cuenta no tiene la conexión (la API
   devolvió "Add a Login Connection"). En vercel.com → Settings → Login
   Connections conecta GitHub, y en el proyecto → Settings → Git vincula
   `desarrolloweb-cotecnova/credinova` para que cada push despliegue solo.
   Mientras tanto los despliegues se suben manualmente con el CLI.
3. **Subir el PDF** `autorizaciones-credito-educativo.pdf` al bucket
   `public-documents` (la Sección F del formulario lo enlaza).
4. **Cierre de Medo**: las solicitudes que entren en la plataforma anterior
   después del export del 27 de julio no están migradas. Si aparecen, pedir un
   export final de `applications`, `application_verifications` y
   `application_status_history`; la carga es por ID y no duplica lo ya migrado.

## Tokens usados y cómo revocarlos

Los tokens viven **solo** en variables de entorno de la sesión
(`SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`); no están en ningún archivo del
repositorio. Para revocarlos cuando termine la migración:

- Supabase: <https://supabase.com/dashboard/account/tokens>
- Vercel: <https://vercel.com/account/settings/tokens>

Ambos se pueden regenerar con alcance mínimo si hace falta repetir tareas.
