-- is_admin() ahora acepta tanto 'admin' como 'rector'
CREATE OR REPLACE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'rector')
      AND is_active = true
  );
$$;

-- Actualizar políticas RLS de internal_users para rector = admin
DROP POLICY IF EXISTS "Solo administradores pueden actualizar usuarios" ON internal_users;
CREATE POLICY "Solo administradores pueden actualizar usuarios"
  ON internal_users FOR UPDATE
  TO authenticated
  USING   (EXISTS (SELECT 1 FROM internal_users u WHERE u.id = auth.uid() AND u.role IN ('admin','rector') AND u.is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM internal_users u WHERE u.id = auth.uid() AND u.role IN ('admin','rector') AND u.is_active = true));

DROP POLICY IF EXISTS "Solo administradores pueden eliminar usuarios" ON internal_users;
CREATE POLICY "Solo administradores pueden eliminar usuarios"
  ON internal_users FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM internal_users u WHERE u.id = auth.uid() AND u.role IN ('admin','rector') AND u.is_active = true));