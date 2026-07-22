-- Migración para la autenticación con Google + MFA.
--
-- Ajusta el trigger `handle_new_internal_user` para que los usuarios que se
-- auto-registran iniciando sesión con Google queden INACTIVOS (is_active=false)
-- hasta que un admin/rector los active desde "Gestión de Usuarios".
--
-- Se preservan dos excepciones para evitar el problema del huevo y la gallina:
--   1. Usuarios creados por un admin vía la edge function `create-internal-user`
--      (llegan con `role` en user_metadata) → se crean ACTIVOS.
--   2. El primer usuario del sistema (cuando internal_users está vacía) y el
--      correo de arranque `desarrolloweb@cotecnova.edu.co` → admin ACTIVO.
--
-- El resto de correos @cotecnova.edu.co que entren por Google quedan como
-- 'gestor' INACTIVO, pendientes de aprobación.

CREATE OR REPLACE FUNCTION public.handle_new_internal_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_bootstrap boolean;
  has_metadata_role boolean;
BEGIN
  IF NEW.email LIKE '%@cotecnova.edu.co' THEN
    has_metadata_role := NEW.raw_user_meta_data->>'role' IN ('admin', 'gestor', 'rector');
    is_bootstrap :=
      NEW.email = 'desarrolloweb@cotecnova.edu.co'
      OR (SELECT COUNT(*) FROM public.internal_users) = 0;

    INSERT INTO public.internal_users (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1)
      ),
      -- Rol
      CASE
        WHEN has_metadata_role THEN NEW.raw_user_meta_data->>'role'
        WHEN is_bootstrap THEN 'admin'
        ELSE 'gestor'
      END,
      -- Estado activo: solo usuarios creados por un admin o de arranque.
      CASE
        WHEN has_metadata_role OR is_bootstrap THEN true
        ELSE false
      END
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
