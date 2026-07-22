-- Migración 00004: Migrar autenticación administrativa a Supabase Auth nativo
-- Esta migración crea usuarios en auth.users y vincula internal_users con auth.users

-- Paso 1: Crear usuarios en auth.users con contraseñas temporales
-- NOTA: Los usuarios deberán cambiar su contraseña en el primer inicio de sesión

-- Crear usuario administrador
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'desarrolloweb@cotecnova.edu.co') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    )
    VALUES (
      '094ebb94-a246-4431-aa76-3a2115b52fb5',
      '00000000-0000-0000-0000-000000000000',
      'desarrolloweb@cotecnova.edu.co',
      crypt('CrediNOVA2024!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Administrador CrediNOVA"}',
      false,
      'authenticated',
      'authenticated'
    );
  END IF;
END $$;

-- Crear usuario gestor
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'creditoycartera@cotecnova.edu.co') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    )
    VALUES (
      '43209765-78b2-4d0d-a611-5464ee2e7275',
      '00000000-0000-0000-0000-000000000000',
      'creditoycartera@cotecnova.edu.co',
      crypt('CrediNOVA2024!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Gestor de Crédito"}',
      false,
      'authenticated',
      'authenticated'
    );
  END IF;
END $$;

-- Crear usuario aprobador
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'contador@cotecnova.edu.co') THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      role,
      aud
    )
    VALUES (
      'd7cc7aa5-ccaf-456f-b8fb-f8757b7fd3d1',
      '00000000-0000-0000-0000-000000000000',
      'contador@cotecnova.edu.co',
      crypt('CrediNOVA2024!', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Aprobador Financiero"}',
      false,
      'authenticated',
      'authenticated'
    );
  END IF;
END $$;

-- Paso 2: Crear identidades para cada usuario
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = '094ebb94-a246-4431-aa76-3a2115b52fb5' AND provider = 'email') THEN
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      '094ebb94-a246-4431-aa76-3a2115b52fb5',
      '094ebb94-a246-4431-aa76-3a2115b52fb5',
      jsonb_build_object('sub', '094ebb94-a246-4431-aa76-3a2115b52fb5', 'email', 'desarrolloweb@cotecnova.edu.co'),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = '43209765-78b2-4d0d-a611-5464ee2e7275' AND provider = 'email') THEN
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      '43209765-78b2-4d0d-a611-5464ee2e7275',
      '43209765-78b2-4d0d-a611-5464ee2e7275',
      jsonb_build_object('sub', '43209765-78b2-4d0d-a611-5464ee2e7275', 'email', 'creditoycartera@cotecnova.edu.co'),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.identities WHERE user_id = 'd7cc7aa5-ccaf-456f-b8fb-f8757b7fd3d1' AND provider = 'email') THEN
    INSERT INTO auth.identities (
      provider_id,
      user_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    VALUES (
      'd7cc7aa5-ccaf-456f-b8fb-f8757b7fd3d1',
      'd7cc7aa5-ccaf-456f-b8fb-f8757b7fd3d1',
      jsonb_build_object('sub', 'd7cc7aa5-ccaf-456f-b8fb-f8757b7fd3d1', 'email', 'contador@cotecnova.edu.co'),
      'email',
      NOW(),
      NOW(),
      NOW()
    );
  END IF;
END $$;

-- Paso 3: Eliminar la columna password_hash de internal_users (ya no es necesaria)
ALTER TABLE internal_users DROP COLUMN IF EXISTS password_hash;

-- Paso 4: Agregar constraint de FK a auth.users
-- Primero verificar que todos los IDs existen en auth.users
DO $$
BEGIN
  -- Solo agregar FK si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'internal_users_id_fkey' 
    AND table_name = 'internal_users'
  ) THEN
    ALTER TABLE internal_users
    ADD CONSTRAINT internal_users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Paso 5: Crear función helper para obtener perfil de usuario
CREATE OR REPLACE FUNCTION get_user_profile(user_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN
) 
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT 
    iu.id,
    iu.email,
    iu.full_name,
    iu.role,
    iu.is_active
  FROM internal_users iu
  WHERE iu.id = user_id AND iu.is_active = true;
$$;

-- Paso 6: Crear función helper para verificar si un usuario es admin activo
CREATE OR REPLACE FUNCTION is_active_admin()
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE sql
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
$$;

-- Comentarios
COMMENT ON FUNCTION get_user_profile IS 'Obtiene el perfil de un usuario interno por su ID';
COMMENT ON FUNCTION is_active_admin IS 'Verifica si el usuario actual es un administrador activo';
