# Estado de la migración a infraestructura propia

Última actualización: 2026-07-24 (sesión de Claude Code, ejecutada vía
Management API de Supabase y API de Vercel).

## Infraestructura activa

| Pieza | Valor |
| --- | --- |
| Proyecto Supabase | `CrediNOVA` — ref **`ufsfugrwlujelofodnlt`** (org Cotecnova, plan free, región us-west-2) |
| URL Supabase | `https://ufsfugrwlujelofodnlt.supabase.co` |
| Proyecto Vercel | `credinova` (`prj_z6quJ204YavFWovPofxNmvOYLdrQ`, team `credinova-3371`) |
| URL de producción | **https://credinova-henna.vercel.app** |

> Nota: se decidió **reusar** el proyecto Supabase `CrediNOVA` ya existente
> (estaba vacío) en lugar de crear `credinova-prod`; por eso la región es
> us-west-2.

## Qué quedó hecho (automatizado)

- ✅ **33/33 migraciones** aplicadas en orden en la base nueva. Se corrigieron
  dos migraciones que estaban rotas para instalaciones desde cero (ver
  historial de git): `00005` (política sobre `credit_study_costs` referenciaba
  una columna `is_active` inexistente + idempotencia de políticas de
  `internal_users`) y `00015` (`COMMENT ON SCHEMA storage` requería owner).
- ✅ RLS activo en las 11 tablas públicas. La tabla `application_documents`
  **no existe a propósito** (la migración 00014 la elimina; el checklist de
  `MIGRACION_CREDINOVA.md` §3 estaba desactualizado en ese punto).
- ✅ Bucket `public-documents` (público) con sus políticas.
- ✅ `pg_cron` + job `supabase-keepalive` (cada 3 días, 06:00 UTC).
- ✅ **9 Edge Functions** desplegadas (`create/update/delete-internal-user`,
  `delete-application`, `send-email`, `send-email-test`, `send-otp`,
  `verify-otp`, `supabase-monitor`), todas con `verify_jwt`.
- ✅ Auth: proveedor **Email deshabilitado** (neutraliza los usuarios heredados
  con contraseña), **TOTP habilitado**, `site_url` y redirect URLs apuntando a
  la URL de producción de Vercel y a `http://localhost:5173/auth/callback`.
- ✅ Vercel: proyecto creado con las 4 variables (`VITE_SUPABASE_URL`,
  `VITE_SUPABASE_ANON_KEY`, `VITE_CLOUDINARY_CLOUD_NAME`,
  `VITE_CLOUDINARY_UPLOAD_PRESET`) en Production/Preview/Development y un
  deployment de producción en estado **READY** (subido con el CLI, ver
  pendientes).
- ✅ `.mcp.json` en la raíz: servidor MCP de Supabase apuntando al project-ref
  (el token se lee de `SUPABASE_ACCESS_TOKEN`, nunca está en el archivo).
- ✅ Prueba en vivo: `SELECT` sobre la base nueva devuelve 3 `internal_users`
  (heredados, inertes) y 4 `academic_programs`; 0 solicitudes.

## Checklist de pasos manuales pendientes

1. **Google OAuth** (único bloqueante para poder iniciar sesión):
   - Crear el cliente OAuth en Google Cloud Console (guía
     `MIGRACION_CREDINOVA.md` §6) con redirect
     `https://ufsfugrwlujelofodnlt.supabase.co/auth/v1/callback`.
   - En Supabase → Authentication → Providers → Google: activar y pegar
     Client ID/Secret.
2. **Secrets de las Edge Functions** (Supabase → Edge Functions → Secrets, o
   `supabase secrets set`): `BREVO_API_KEY`, `RESEND_API_KEY`,
   `RESEND_FROM_EMAIL`. Sin ellos, `send-otp`/`send-email*` fallarán.
3. **Conectar GitHub con Vercel**: la cuenta de Vercel no tiene la conexión
   con GitHub (la API devolvió "Add a Login Connection"). En
   vercel.com → Settings → Login Connections conecta GitHub, y en el proyecto
   `credinova` → Settings → Git vincula `desarrolloweb-cotecnova/credinova`
   para que cada push despliegue solo. Mientras tanto el deploy actual fue
   subido manualmente y funciona.
4. **Subir el PDF de autorizaciones** `autorizaciones-credito-educativo.pdf`
   al bucket `public-documents` (la Sección F del formulario lo enlaza).
5. **Primer administrador**: entrar en `/admin/login` con Google (p. ej.
   `rector@cotecnova.edu.co`); el primer usuario queda admin activo y se le
   pide enrolar TOTP (guía §9).
6. **Dominio propio** (opcional): añadirlo en Vercel → Domains y actualizar
   Site URL/Redirect URLs en Supabase Auth (o pedirme que lo haga por API).
7. **Datos históricos**: cuando estén los Excel de Medo, generar los INSERT
   (guía §10). Pendiente de tu confirmación — no se importó ningún dato.

## Tokens usados y cómo revocarlos

Los tokens viven **solo** en variables de entorno de la sesión
(`SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`); no están en ningún archivo del
repositorio. Para revocarlos cuando termine la migración:

- Supabase: <https://supabase.com/dashboard/account/tokens> → borrar el token.
- Vercel: <https://vercel.com/account/settings/tokens> → borrar el token.

Ambos se pueden regenerar con alcance mínimo si hace falta repetir tareas.
