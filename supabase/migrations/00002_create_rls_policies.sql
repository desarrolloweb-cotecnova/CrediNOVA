-- Habilitar RLS en todas las tablas
ALTER TABLE internal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;

-- Políticas para internal_users (solo usuarios autenticados pueden ver)
CREATE POLICY "Los usuarios internos pueden ver todos los usuarios"
  ON internal_users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo administradores pueden insertar usuarios"
  ON internal_users FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM internal_users
      WHERE id = auth.uid()::uuid AND role = 'administrador'
    )
  );

CREATE POLICY "Solo administradores pueden actualizar usuarios"
  ON internal_users FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM internal_users
      WHERE id = auth.uid()::uuid AND role = 'administrador'
    )
  );

-- Políticas para applications (acceso público para consulta con código + cédula)
CREATE POLICY "Cualquiera puede crear solicitudes"
  ON applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios internos pueden ver todas las solicitudes"
  ON applications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios internos pueden actualizar solicitudes"
  ON applications FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas para application_history
CREATE POLICY "Usuarios internos pueden ver historial"
  ON application_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios internos pueden insertar historial"
  ON application_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas para phone_validations
CREATE POLICY "Usuarios internos pueden ver validaciones"
  ON phone_validations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios internos pueden insertar validaciones"
  ON phone_validations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios internos pueden actualizar validaciones"
  ON phone_validations FOR UPDATE
  TO authenticated
  USING (true);

-- Políticas para otps (acceso público para verificación)
CREATE POLICY "Cualquiera puede insertar OTPs"
  ON otps FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Cualquiera puede leer OTPs"
  ON otps FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Cualquiera puede actualizar OTPs"
  ON otps FOR UPDATE
  TO anon, authenticated
  USING (true);

-- Políticas para audit_logs
CREATE POLICY "Usuarios internos pueden ver logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios internos pueden insertar logs"
  ON audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Políticas para payment_plans
CREATE POLICY "Usuarios internos pueden ver planes de pago"
  ON payment_plans FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios internos pueden insertar planes de pago"
  ON payment_plans FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios internos pueden actualizar planes de pago"
  ON payment_plans FOR UPDATE
  TO authenticated
  USING (true);