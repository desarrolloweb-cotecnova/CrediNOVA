
-- Eliminar política conflictiva que requiere ser administrador para insertar
DROP POLICY IF EXISTS "Solo administradores pueden insertar usuarios" ON internal_users;

-- Mantener solo la política que permite auto-registro
-- Ya existe: "Usuarios autenticados pueden crear su propio perfil"

-- Comentario explicativo
COMMENT ON POLICY "Usuarios autenticados pueden crear su propio perfil" ON internal_users IS 
'Permite que usuarios autenticados en auth.users creen su registro en internal_users durante el proceso de registro. Esta es la única política de INSERT necesaria.';
