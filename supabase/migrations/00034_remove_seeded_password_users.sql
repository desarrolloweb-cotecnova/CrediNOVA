-- Migración 00034: eliminar los usuarios sembrados con contraseña y sanear
-- las columnas de token de auth.users.
--
-- PROBLEMA QUE RESUELVE
-- La migración 00004 insertó tres usuarios directamente en `auth.users`
-- (desarrolloweb@, contador@, creditoycartera@) sin rellenar las columnas de
-- token (`confirmation_token`, `recovery_token`, `email_change`, …), que
-- quedaron en NULL. GoTrue (el servicio de Auth) las lee como texto NO nulo,
-- así que cualquier operación que tocara esas filas fallaba con HTTP 500:
--
--   error finding user: sql: Scan error on column index 3, name
--   "confirmation_token": converting NULL to string is unsupported
--
-- Esto rompía el inicio de sesión con Google (al buscar la cuenta existente
-- para enlazar la identidad) y también el borrado desde el panel o la Admin API.
--
-- Con el acceso exclusivamente por Google, esos usuarios con contraseña ya no
-- tienen función: el primer correo institucional que entre queda como admin
-- activo por el trigger `handle_new_internal_user` (ver migración 00033).

-- 1) Eliminar los usuarios sembrados. El borrado en `auth.users` arrastra en
--    cascada sus identidades, sesiones, factores MFA y su fila de
--    `internal_users`. Es idempotente: si ya no están, no hace nada.
DELETE FROM auth.users
WHERE email IN (
  'desarrolloweb@cotecnova.edu.co',
  'contador@cotecnova.edu.co',
  'creditoycartera@cotecnova.edu.co'
)
AND encrypted_password IS NOT NULL;

-- 2) Red de seguridad: normalizar a cadena vacía cualquier columna de token en
--    NULL. Si en el futuro se vuelve a sembrar un usuario a mano por SQL, esto
--    evita reproducir el mismo error de GoTrue.
UPDATE auth.users
SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change               = COALESCE(phone_change, ''),
  phone_change_token         = COALESCE(phone_change_token, ''),
  reauthentication_token     = COALESCE(reauthentication_token, '')
WHERE
  confirmation_token IS NULL
  OR recovery_token IS NULL
  OR email_change IS NULL
  OR email_change_token_new IS NULL
  OR email_change_token_current IS NULL
  OR phone_change IS NULL
  OR phone_change_token IS NULL
  OR reauthentication_token IS NULL;
