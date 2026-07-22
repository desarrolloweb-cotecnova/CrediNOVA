-- Migración 00005: Actualizar políticas RLS para usar auth.uid()
-- Esta migración recrea todas las políticas RLS para usar autenticación nativa de Supabase

-- ============================================================================
-- TABLA: applications
-- ============================================================================

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Cualquiera puede crear solicitudes" ON applications;
DROP POLICY IF EXISTS "Usuarios internos pueden ver todas las solicitudes" ON applications;
DROP POLICY IF EXISTS "Usuarios internos pueden actualizar solicitudes" ON applications;

-- Política INSERT: Permitir a anónimos y autenticados crear solicitudes (formulario público)
CREATE POLICY "Cualquiera puede crear solicitudes"
ON applications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política SELECT: Solo usuarios internos activos pueden ver solicitudes
CREATE POLICY "Usuarios internos activos pueden ver solicitudes"
ON applications
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política UPDATE: Solo usuarios internos activos pueden actualizar solicitudes
CREATE POLICY "Usuarios internos activos pueden actualizar solicitudes"
ON applications
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política DELETE: Solo administradores pueden eliminar solicitudes
CREATE POLICY "Solo administradores pueden eliminar solicitudes"
ON applications
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND role = 'administrador'
    AND is_active = true
  )
);

-- ============================================================================
-- TABLA: application_history
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Usuarios internos pueden ver historial" ON application_history;
DROP POLICY IF EXISTS "Usuarios internos pueden crear historial" ON application_history;

-- Política SELECT: Solo usuarios internos activos pueden ver historial
CREATE POLICY "Usuarios internos activos pueden ver historial"
ON application_history
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política INSERT: Solo usuarios internos activos pueden crear historial
CREATE POLICY "Usuarios internos activos pueden crear historial"
ON application_history
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- ============================================================================
-- TABLA: phone_validations
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Cualquiera puede crear validaciones" ON phone_validations;
DROP POLICY IF EXISTS "Cualquiera puede leer sus validaciones" ON phone_validations;

-- Política INSERT: Permitir a todos crear validaciones
CREATE POLICY "Cualquiera puede crear validaciones de teléfono"
ON phone_validations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política SELECT: Permitir a todos leer sus validaciones
CREATE POLICY "Cualquiera puede leer validaciones de teléfono"
ON phone_validations
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================================
-- TABLA: payment_plans
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Cualquiera puede ver planes" ON payment_plans;
DROP POLICY IF EXISTS "Usuarios internos pueden gestionar planes" ON payment_plans;

-- Política SELECT: Todos pueden ver planes
CREATE POLICY "Cualquiera puede ver planes de pago"
ON payment_plans
FOR SELECT
TO anon, authenticated
USING (true);

-- Política INSERT: Solo usuarios internos activos pueden crear planes
CREATE POLICY "Usuarios internos activos pueden crear planes"
ON payment_plans
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política UPDATE: Solo usuarios internos activos pueden actualizar planes
CREATE POLICY "Usuarios internos activos pueden actualizar planes"
ON payment_plans
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- ============================================================================
-- TABLA: audit_logs
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Usuarios internos pueden ver logs" ON audit_logs;
DROP POLICY IF EXISTS "Sistema puede crear logs" ON audit_logs;

-- Política SELECT: Solo usuarios internos activos pueden ver logs
CREATE POLICY "Usuarios internos activos pueden ver logs de auditoría"
ON audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política INSERT: Sistema puede crear logs (sin restricción de usuario)
CREATE POLICY "Sistema puede crear logs de auditoría"
ON audit_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- ============================================================================
-- TABLA: academic_programs
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Cualquiera puede ver programas" ON academic_programs;
DROP POLICY IF EXISTS "Usuarios internos pueden gestionar programas" ON academic_programs;

-- Política SELECT: Todos pueden ver programas activos
CREATE POLICY "Cualquiera puede ver programas académicos activos"
ON academic_programs
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Política INSERT: Solo usuarios internos activos pueden crear programas
CREATE POLICY "Usuarios internos activos pueden crear programas"
ON academic_programs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política UPDATE: Solo usuarios internos activos pueden actualizar programas
CREATE POLICY "Usuarios internos activos pueden actualizar programas"
ON academic_programs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- ============================================================================
-- TABLA: credit_study_costs
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Cualquiera puede ver costos" ON credit_study_costs;
DROP POLICY IF EXISTS "Usuarios internos pueden gestionar costos" ON credit_study_costs;

-- Política SELECT: Todos pueden ver costos activos
CREATE POLICY "Cualquiera puede ver costos de estudio activos"
ON credit_study_costs
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Política INSERT: Solo usuarios internos activos pueden crear costos
CREATE POLICY "Usuarios internos activos pueden crear costos"
ON credit_study_costs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política UPDATE: Solo usuarios internos activos pueden actualizar costos
CREATE POLICY "Usuarios internos activos pueden actualizar costos"
ON credit_study_costs
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- ============================================================================
-- TABLA: internal_users
-- ============================================================================

-- Eliminar políticas antiguas si existen
DROP POLICY IF EXISTS "Usuarios internos pueden ver otros usuarios" ON internal_users;
DROP POLICY IF EXISTS "Solo administradores pueden gestionar usuarios" ON internal_users;

-- Política SELECT: Solo usuarios internos activos pueden ver otros usuarios
CREATE POLICY "Usuarios internos activos pueden ver otros usuarios"
ON internal_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Política UPDATE: Solo administradores pueden actualizar usuarios
CREATE POLICY "Solo administradores pueden actualizar usuarios"
ON internal_users
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND role = 'administrador'
    AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND role = 'administrador'
    AND is_active = true
  )
);

-- Comentarios
COMMENT ON POLICY "Usuarios internos activos pueden ver solicitudes" ON applications IS 'Permite a usuarios internos activos ver todas las solicitudes';
COMMENT ON POLICY "Usuarios internos activos pueden actualizar solicitudes" ON applications IS 'Permite a usuarios internos activos actualizar solicitudes';
COMMENT ON POLICY "Solo administradores pueden eliminar solicitudes" ON applications IS 'Solo administradores pueden eliminar solicitudes';
