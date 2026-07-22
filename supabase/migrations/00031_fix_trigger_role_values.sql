-- Actualizar función del trigger para usar valores de rol correctos
-- y leer el rol desde user_metadata cuando viene del edge function
CREATE OR REPLACE FUNCTION public.handle_new_internal_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Solo procesar emails institucionales
  IF NEW.email LIKE '%@cotecnova.edu.co' THEN
    INSERT INTO public.internal_users (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      -- Leer rol desde metadata si viene del edge function, si no asignar 'gestor'
      CASE
        WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'gestor', 'rector')
          THEN NEW.raw_user_meta_data->>'role'
        WHEN NEW.email = 'desarrolloweb@cotecnova.edu.co' THEN 'admin'
        WHEN (SELECT COUNT(*) FROM public.internal_users) = 0 THEN 'admin'
        ELSE 'gestor'
      END,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;