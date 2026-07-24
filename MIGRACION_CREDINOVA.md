# Migración de CrediNOVA a infraestructura propia

Guía paso a paso para sacar CrediNOVA de Medo.dev y ponerlo en marcha con:

- **Supabase** propio (base de datos, Auth, Storage, Edge Functions)
- **Vercel** propio (cuenta `credinova@cotecnova.edu.co`) para el frontend
- **GitHub** `desarrolloweb-cotecnova/credinova` (ya vinculado)
- **Autenticación** con Google (dominio `@cotecnova.edu.co`) + segundo factor
  TOTP con Google Authenticator (MFA nativo de Supabase)

Las integraciones externas (Cloudinary, ZapSign, Brevo/Resend) **se reutilizan**
tal como están; solo cambian Supabase y Vercel.

> Los cambios de código ya están aplicados en la rama
> `claude/credinova-migration-supabase-pqe2iu`. Esta guía cubre lo que debes
> configurar tú en las plataformas (cuentas, claves y despliegue).

---

## 0. Resumen de la arquitectura

| Pieza | Dónde vive | Qué hay que hacer |
| --- | --- | --- |
| Frontend (Vite/React) | Vercel | Importar repo + variables de entorno |
| Base de datos / RLS | Supabase (Postgres) | Aplicar migraciones |
| Autenticación | Supabase Auth + Google OAuth | Configurar proveedor Google + MFA |
| Almacenamiento de PDF | Supabase Storage (`public-documents`) + Cloudinary | Crear bucket |
| Lógica de servidor | Supabase Edge Functions (Deno) | Desplegar + secrets |
| Correo | Brevo / Resend | Reutilizar API keys (secrets) |
| Firma electrónica | ZapSign | Reutilizar (sin cambios de infraestructura) |

---

## 1. Requisitos previos

1. Cuenta de **Supabase** nueva (puedes entrar con la cuenta Google institucional).
2. Cuenta de **Vercel** nueva con `credinova@cotecnova.edu.co`.
3. Acceso a **Google Cloud Console** con una cuenta que administre el dominio
   `cotecnova.edu.co` (para crear el cliente OAuth).
4. Tener a la mano las claves actuales que se reutilizan: `BREVO_API_KEY`,
   `RESEND_API_KEY` + `RESEND_FROM_EMAIL`, y (si aplica) la API key de ZapSign.
5. En tu equipo, para las tareas por línea de comandos:
   - Node.js ≥ 20 y `pnpm`
   - **Supabase CLI** (`npm i -g supabase`) — recomendado para aplicar el esquema
     y desplegar las funciones.

---

## 2. Crear el proyecto de Supabase

1. En <https://supabase.com/dashboard> → **New project**.
2. Nombre: `credinova`. Región: la más cercana (p. ej. *East US* / *South America*).
   Guarda la **Database password** en un gestor de contraseñas.
3. Cuando termine de aprovisionar, ve a **Settings → API** y copia:
   - **Project URL** → será `VITE_SUPABASE_URL`
   - **anon public** key → será `VITE_SUPABASE_ANON_KEY`
   - **service_role** key → solo para tareas administrativas/servidor (NUNCA en el frontend)
4. Anota también el **Project Ref** (el subdominio `xxxxx` de `xxxxx.supabase.co`).

---

## 3. Aplicar el esquema de la base de datos

El esquema está versionado en `supabase/migrations/` (33 migraciones, en orden).

### Opción A — Supabase CLI (recomendada)

```bash
# En la raíz del repo
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

`db push` aplica todas las migraciones en orden.

### Opción B — Editor SQL del panel

Si prefieres no usar el CLI, abre **SQL Editor** en el panel y ejecuta el
contenido de cada archivo de `supabase/migrations/` **en orden numérico**
(`00001…` → `00033…`). No te saltes ninguno: hay dependencias entre ellos.

### Notas del esquema

- La migración **00004** siembra 3 usuarios internos heredados con contraseña
  temporal. Con login por Google esos usuarios quedan inertes al **deshabilitar
  el proveedor Email/Password** (paso 7). No es necesario borrarlos.
- La migración **00033** ajusta el trigger para que los nuevos usuarios que entren
  por Google queden **inactivos** hasta que un admin/rector los active.
- La migración **00029** usa la extensión **`pg_cron`** (keepalive cada 3 días para
  que el proyecto no se pause). Si `pg_cron` no está disponible, habilítala en
  **Database → Extensions** y vuelve a ejecutar esa migración.

Verifica al final que existan las tablas `internal_users`, `applications`,
`academic_programs`, `credit_study_costs`, `otps`,
`application_verifications` y el historial, y que **RLS** esté activo.
(`application_documents` no debe existir: la migración 00014 la elimina.)

---

## 4. Storage (bucket de documentos)

La migración **00015** crea el bucket **`public-documents`** (público) con sus
políticas. Verifica en **Storage** que exista. Si no, ejecútala manualmente.

Sube además al bucket el PDF **`autorizaciones-credito-educativo.pdf`**
(Sección F del formulario lo enlaza desde `public-documents`; descárgalo del
proyecto anterior o usa el original que tenga la institución).

> Los documentos que suben los solicitantes usan **Cloudinary** (preset sin firma
> `credinova_unsigned`, cuenta `drqfuh66o`), que se reutiliza sin cambios.

---

## 5. Desplegar las Edge Functions

Funciones en `supabase/functions/`: `create-internal-user`, `update-internal-user`,
`delete-internal-user`, `delete-application`, `send-email`, `send-email-test`,
`send-otp`, `verify-otp`, `supabase-monitor`.

```bash
supabase functions deploy create-internal-user update-internal-user \
  delete-internal-user delete-application send-email send-email-test \
  send-otp verify-otp supabase-monitor
# (o: supabase functions deploy   para desplegar todas)
```

Carga los **secrets** (usa tus claves actuales de Brevo/Resend):

```bash
supabase secrets set \
  BREVO_API_KEY="<tu-brevo-api-key>" \
  RESEND_API_KEY="<tu-resend-api-key>" \
  RESEND_FROM_EMAIL="<tu-remitente-verificado>"
```

> `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY` los inyecta
> Supabase automáticamente en las funciones; **no** los definas a mano.

---

## 6. Crear el cliente OAuth de Google (Google Cloud Console)

1. Entra a <https://console.cloud.google.com/> con una cuenta admin del dominio.
2. Crea (o elige) un **proyecto** — p. ej. `CrediNOVA`.
3. **APIs y servicios → Pantalla de consentimiento OAuth**:
   - Tipo de usuario: **Interno** (restringe a `@cotecnova.edu.co`).
   - Completa nombre de la app, correo de soporte y dominios.
4. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**:
   - Tipo: **Aplicación web**.
   - **URI de redireccionamiento autorizado**:
     `https://TU_PROJECT_REF.supabase.co/auth/v1/callback`
5. Guarda el **Client ID** y el **Client Secret**.

---

## 7. Configurar Auth en Supabase

En **Authentication** del panel de Supabase:

1. **Providers → Google**: actívalo y pega el **Client ID** y **Client Secret**
   del paso 6. Guarda.
2. **Providers → Email**: **desactívalo** (o al menos desactiva "Enable email
   signups"/contraseña). El acceso es solo por Google; esto neutraliza los
   usuarios heredados con contraseña de la migración 00004.
3. **Multi-Factor Authentication (MFA)**: asegúrate de que **TOTP (App
   Authenticator)** esté **habilitado** (es el código de Google Authenticator).
4. **URL Configuration**:
   - **Site URL**: la URL de producción de Vercel
     (p. ej. `https://credinova.cotecnova.edu.co`).
   - **Redirect URLs** (añade todas):
     - `https://credinova.cotecnova.edu.co/auth/callback`
     - la URL `*.vercel.app` que asigne Vercel + `/auth/callback`
     - `http://localhost:5173/auth/callback` (desarrollo)

> El código ya envía `hd=cotecnova.edu.co` y restringe el dominio en el cliente,
> pero la restricción fuerte se logra con la pantalla de consentimiento **Interna**
> (paso 6.3) y el proveedor Email deshabilitado.

---

## 8. Desplegar en Vercel

1. En <https://vercel.com/> (cuenta `credinova@cotecnova.edu.co`) → **Add New →
   Project** → importa `desarrolloweb-cotecnova/credinova`.
2. Framework: **Vite** (se detecta solo; ya hay `vercel.json` con los rewrites SPA).
3. **Environment Variables** (Production y Preview):

   | Nombre | Valor |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Project URL de Supabase |
   | `VITE_SUPABASE_ANON_KEY` | anon key de Supabase |
   | `VITE_CLOUDINARY_CLOUD_NAME` | `drqfuh66o` |
   | `VITE_CLOUDINARY_UPLOAD_PRESET` | `credinova_unsigned` |

4. **Deploy**. Cuando termine, copia la URL asignada.
5. (Opcional) Configura el dominio `credinova.cotecnova.edu.co` en **Settings →
   Domains** y vuelve al **paso 7.4** para actualizar Site URL / Redirect URLs.

---

## 9. Crear el primer administrador (bootstrap)

El trigger deja inactivos a los nuevos usuarios, salvo el **primer** usuario del
sistema, que se crea como **admin activo**. Por eso:

1. Con todo desplegado, entra a `/admin/login` y haz **"Iniciar sesión con Google"**
   con la cuenta que será administradora (p. ej. `rector@cotecnova.edu.co`).
2. Al ser el primer registro, quedará como **admin activo**. Se te pedirá
   **configurar el 2FA** (escanear el QR con Google Authenticator) y luego entrarás
   al panel.
3. Desde **Gestión de Usuarios** podrás activar y asignar rol a los siguientes
   usuarios que entren por Google (que quedan inactivos por defecto).

> Alternativa por SQL: si prefieres designar el admin a mano, tras su primer login
> ejecuta en el SQL Editor:
> ```sql
> UPDATE internal_users
> SET role = 'rector', is_active = true
> WHERE email = 'rector@cotecnova.edu.co';
> ```

---

## 10. Importar los datos (Excel → SQL)

Cuando tengas los Excel exportados desde Medo:

1. Pásamelos (o compárteme las columnas) y genero los `INSERT` SQL respetando las
   llaves foráneas, en este **orden**:
   1. Catálogos: `academic_programs`, `credit_study_costs`
   2. `internal_users` (los que ya existían como personal)
   3. `applications`
   4. `application_documents`, `application_verifications`, historial
2. Ejecuta el SQL en el **SQL Editor** del nuevo proyecto (después del esquema).

> Los usuarios de `auth.users` para login con Google se crean solos en el primer
> inicio de sesión. Para datos históricos ligados a un `user_id` mapeamos por
> correo o sembramos según lo que traiga el Excel.

---

## 11. Verificación end-to-end

- [ ] `pnpm install && pnpm build` sin errores (ya verificado en la rama).
- [ ] Login con una cuenta `@cotecnova.edu.co` → redirige a Google →
      `/auth/callback` → **enrolar TOTP** (QR) → 6 dígitos → entra a `/admin/dashboard`.
- [ ] Cerrar sesión y volver a entrar → ahora pide **verificar** (no enrolar) el código.
- [ ] Un correo que **no** sea `@cotecnova.edu.co` es rechazado.
- [ ] Un segundo usuario Google entra como **inactivo** y no accede hasta que un
      admin lo activa en **Gestión de Usuarios**.
- [ ] `/admin/*` es inaccesible sin haber pasado el 2FA (AAL2).
- [ ] Flujo público (nueva solicitud) funciona y guarda contra el nuevo proyecto.
- [ ] Una Edge Function (p. ej. envío de correo de prueba) responde correctamente.

---

## 12. Seguridad y mantenimiento

- El archivo `.env` **nunca** se sube (está en `.gitignore`). En Vercel las
  variables viven en el panel.
- La `service_role` key solo se usa en el servidor/CLI; jamás en el frontend.
- Los logos actuales en `public/images/brand/` son **placeholders** (el logo
  original estaba en el CDN de Medo, inaccesible). Reemplaza esos archivos por la
  marca definitiva conservando el mismo nombre y no habrá que tocar código.
- Recuerda migrar a futuro Cloudinary/ZapSign/Brevo a cuentas propias de COTECNOVA
  cuando se decida (hoy se reutilizan).
