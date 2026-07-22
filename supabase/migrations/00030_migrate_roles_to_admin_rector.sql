-- 1. Eliminar constraint de rol antigua
ALTER TABLE internal_users DROP CONSTRAINT IF EXISTS internal_users_role_check;

-- 2. Migrar valores existentes
UPDATE internal_users SET role = 'admin'   WHERE role = 'administrador';
UPDATE internal_users SET role = 'rector'  WHERE role = 'aprobador';

-- 3. Nuevo constraint alineado con el código
ALTER TABLE internal_users
  ADD CONSTRAINT internal_users_role_check
  CHECK (role = ANY (ARRAY['admin'::text, 'gestor'::text, 'rector'::text]));

-- 4. Actualizar función is_admin()
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_users
    WHERE id = auth.uid()
      AND role = 'admin'
      AND is_active = true
  );
$$;

-- 5. Actualizar políticas RLS que usan 'administrador'
DROP POLICY IF EXISTS "Solo administradores pueden actualizar usuarios" ON internal_users;
CREATE POLICY "Solo administradores pueden actualizar usuarios"
  ON internal_users FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM internal_users u
    WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM internal_users u
    WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
  ));

DROP POLICY IF EXISTS "Solo administradores pueden eliminar usuarios" ON internal_users;
CREATE POLICY "Solo administradores pueden eliminar usuarios"
  ON internal_users FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM internal_users u
    WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
  ));