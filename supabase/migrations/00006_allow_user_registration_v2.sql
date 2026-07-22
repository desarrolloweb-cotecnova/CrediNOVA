
-- Migración: Permitir registro de usuarios
-- Actualizar políticas RLS para permitir que los usuarios se auto-registren en internal_users

-- Eliminar todas las políticas existentes de internal_users
DROP POLICY IF EXISTS "Solo administradores pueden crear usuarios internos" ON internal_users;
DROP POLICY IF EXISTS "Usuarios internos pueden ver otros usuarios internos" ON internal_users;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar usuarios internos" ON internal_users;
DROP POLICY IF EXISTS "Solo administradores pueden actualizar usuarios" ON internal_users;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil y otros perfiles activos" ON internal_users;
DROP POLICY IF EXISTS "Usuarios autenticados pueden crear su propio perfil" ON internal_users;

-- Crear nueva política que permite a usuarios autenticados crear su propio registro
CREATE POLICY "Usuarios autenticados pueden crear su propio perfil"
ON internal_users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Política para lectura: usuarios pueden ver su propio perfil y otros perfiles activos
CREATE POLICY "Usuarios pueden ver perfiles"
ON internal_users
FOR SELECT
TO authenticated
USING (
  auth.uid() = id OR
  EXISTS (
    SELECT 1 FROM internal_users
    WHERE id = auth.uid() AND is_active = true
  )
);

-- Política para actualización: solo administradores
CREATE POLICY "Solo administradores pueden actualizar usuarios"
ON internal_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM internal_users
    WHERE id = auth.uid() 
    AND role = 'administrador' 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM internal_users
    WHERE id = auth.uid() 
    AND role = 'administrador' 
    AND is_active = true
  )
);

-- Política para eliminación: solo administradores
CREATE POLICY "Solo administradores pueden eliminar usuarios"
ON internal_users
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM internal_users
    WHERE id = auth.uid() 
    AND role = 'administrador' 
    AND is_active = true
  )
);
