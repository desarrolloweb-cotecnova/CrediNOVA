-- Migración 00008: Corregir política SELECT recursiva en internal_users
-- Problema: La política SELECT actual causa recursión infinita (42P17)
-- Solución: Políticas simples + función SECURITY DEFINER + trigger automático

-- Paso 1: Eliminar todas las políticas SELECT recursivas
DROP POLICY IF EXISTS "Usuarios pueden ver perfiles" ON internal_users;
DROP POLICY IF EXISTS "Usuarios internos activos pueden ver otros usuarios" ON internal_users;
DROP POLICY IF EXISTS "Usuarios internos pueden ver otros usuarios" ON internal_users;
DROP POLICY IF EXISTS "Los usuarios internos pueden ver todos los usuarios" ON internal_users;

-- Paso 2: Crear política simple sin recursión
-- Cada usuario puede leer SU propia fila
CREATE POLICY "Usuario puede leer su propio perfil"
ON internal_users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Paso 3: Crear función SECURITY DEFINER para verificar si es admin
-- Esto evita la recursión RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_users
    WHERE id = auth.uid()
    AND role = 'administrador'
    AND is_active = true
  );
$$;

-- Paso 4: Política para que administradores vean todos los perfiles
CREATE POLICY "Administradores pueden ver todos los perfiles"
ON internal_users
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Paso 5: Reparar perfiles faltantes para usuarios @cotecnova.edu.co
-- ya creados en auth.users pero no en internal_users
INSERT INTO internal_users (id, email, full_name, role, is_active)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
  CASE
    WHEN u.email IN ('rector@cotecnova.edu.co','desarrolloweb@cotecnova.edu.co') THEN 'administrador'
    ELSE 'gestor'
  END,
  true
FROM auth.users u
WHERE u.email LIKE '%@cotecnova.edu.co'
AND NOT EXISTS (SELECT 1 FROM internal_users iu WHERE iu.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Paso 6: Asegurar que usuarios administradores estén activos
UPDATE internal_users
SET is_active = true,
    role = 'administrador'
WHERE email IN ('rector@cotecnova.edu.co','desarrolloweb@cotecnova.edu.co');

-- Paso 7: Crear trigger para auto-crear perfiles en registros futuros
-- Esto evita que el cliente tenga que hacer INSERT manual (que puede fallar por RLS)
CREATE OR REPLACE FUNCTION public.handle_new_internal_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email LIKE '%@cotecnova.edu.co' THEN
    INSERT INTO public.internal_users (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      CASE
        WHEN NEW.email = 'desarrolloweb@cotecnova.edu.co' THEN 'administrador'
        WHEN (SELECT COUNT(*) FROM public.internal_users) = 0 THEN 'administrador'
        ELSE 'gestor'
      END,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Paso 8: Crear trigger en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_internal_user();

-- Comentarios explicativos
COMMENT ON POLICY "Usuario puede leer su propio perfil" ON internal_users IS 
'Permite que cada usuario autenticado lea su propia fila en internal_users sin recursión';

COMMENT ON POLICY "Administradores pueden ver todos los perfiles" ON internal_users IS 
'Permite que administradores vean todos los perfiles usando función SECURITY DEFINER para evitar recursión';

COMMENT ON FUNCTION public.is_admin() IS 
'Función SECURITY DEFINER que verifica si el usuario actual es administrador activo, evitando recursión RLS';

COMMENT ON FUNCTION public.handle_new_internal_user() IS 
'Trigger que crea automáticamente el perfil en internal_users cuando se registra un usuario con dominio @cotecnova.edu.co';
