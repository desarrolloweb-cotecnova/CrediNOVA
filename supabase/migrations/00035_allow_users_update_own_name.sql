-- Migración 00035: permitir que cada usuario edite su propio nombre.
--
-- La política de UPDATE sobre `internal_users` solo admite a admin/rector, así
-- que un gestor no podía corregir su propio nombre desde "Mi Perfil".
--
-- No se añade una política de UPDATE por fila propia a propósito: `WITH CHECK`
-- no puede comparar con la fila anterior, de modo que cualquiera podría
-- ascenderse a admin o autoactivarse en el mismo UPDATE. En su lugar se expone
-- una función SECURITY DEFINER que solo toca `full_name` de la fila del
-- llamante; el rol y el estado activo siguen siendo exclusivos del admin.

CREATE OR REPLACE FUNCTION public.update_my_full_name(new_full_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No hay sesión activa';
  END IF;

  IF btrim(coalesce(new_full_name, '')) = '' THEN
    RAISE EXCEPTION 'El nombre no puede estar vacío';
  END IF;

  UPDATE public.internal_users
  SET full_name = btrim(new_full_name),
      updated_at = now()
  WHERE id = auth.uid();
END;
$$;

COMMENT ON FUNCTION public.update_my_full_name IS
  'Permite al usuario autenticado cambiar únicamente su propio nombre. No puede alterar rol ni estado activo.';

REVOKE ALL ON FUNCTION public.update_my_full_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_my_full_name(text) TO authenticated;
