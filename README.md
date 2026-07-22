# CrediNOVA

Plataforma de gestión de solicitudes de crédito educativo de **COTECNOVA**.
Los estudiantes registran y consultan sus solicitudes de crédito; el personal
administrativo las gestiona, verifica documentos y hace seguimiento desde un panel interno.

## Tecnologías

- **Frontend:** Vite + React + TypeScript + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Autenticación:** Google OAuth (dominio `@cotecnova.edu.co`) + doble factor TOTP
  (Google Authenticator) mediante el MFA nativo de Supabase
- **Servicios externos:** Cloudinary (documentos), ZapSign (firma electrónica),
  Brevo (correo transaccional)
- **Despliegue:** Vercel

## Requisitos

- Node.js ≥ 20
- pnpm ≥ 9

## Desarrollo local

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con las claves del proyecto Supabase y Cloudinary

# 3. Levantar el servidor de desarrollo
pnpm dev
```

La app queda disponible en `http://localhost:5173`.

## Scripts

| Comando        | Descripción                                  |
| -------------- | -------------------------------------------- |
| `pnpm dev`     | Servidor de desarrollo (Vite)                |
| `pnpm build`   | Build de producción a `dist/`                |
| `pnpm preview` | Previsualiza el build de producción          |
| `pnpm lint`    | Verificación de tipos y linting              |

## Variables de entorno

Ver `.env.example`. Nunca se debe commitear el archivo `.env` (está en `.gitignore`).

| Variable                        | Descripción                                  |
| ------------------------------- | -------------------------------------------- |
| `VITE_SUPABASE_URL`             | URL del proyecto Supabase                    |
| `VITE_SUPABASE_ANON_KEY`        | Clave pública (anon) de Supabase             |
| `VITE_CLOUDINARY_CLOUD_NAME`    | Nombre de la cuenta de Cloudinary            |
| `VITE_CLOUDINARY_UPLOAD_PRESET` | Preset de carga sin firma de Cloudinary      |

## Estructura del proyecto

```
├── public/                 # Recursos estáticos (logos, imágenes)
├── src/
│   ├── components/         # Componentes (auth, ui, layouts, admin, ...)
│   ├── contexts/           # Contextos de React (AuthContext, ...)
│   ├── db/                 # Cliente de Supabase
│   ├── lib/                # Utilidades (mfa, assets, currency, date, ...)
│   ├── pages/              # Páginas (públicas y del panel admin)
│   ├── routes.tsx          # Configuración de rutas
│   └── services/           # Acceso a datos (Supabase)
├── supabase/
│   ├── migrations/         # Migraciones SQL del esquema
│   └── functions/          # Edge Functions (Deno)
└── vite.config.ts
```

## Migración y despliegue

El procedimiento completo para configurar Supabase, Google OAuth, MFA y Vercel
está documentado en [`MIGRACION_CREDINOVA.md`](./MIGRACION_CREDINOVA.md).
