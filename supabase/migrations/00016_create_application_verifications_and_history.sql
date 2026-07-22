-- Tabla para guardar las verificaciones de cada sección de la solicitud
CREATE TABLE IF NOT EXISTS application_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  section_name text NOT NULL, -- 'student', 'cosigner', 'payment', 'plan'
  verification_status text NOT NULL CHECK (verification_status IN ('cumple', 'no_cumple', 'autorizado_rector')),
  notes text,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(application_id, section_name)
);

-- Tabla para guardar el historial de cambios de estado de las solicitudes
CREATE TABLE IF NOT EXISTS application_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  previous_status text,
  new_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id),
  changed_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_application_verifications_application_id ON application_verifications(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_application_id ON application_status_history(application_id);
CREATE INDEX IF NOT EXISTS idx_application_status_history_changed_at ON application_status_history(changed_at DESC);

-- Políticas RLS para application_verifications
ALTER TABLE application_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all verifications"
  ON application_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM internal_users
      WHERE internal_users.id = auth.uid()
      AND internal_users.role IN ('admin', 'gestor', 'rector')
      AND internal_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert verifications"
  ON application_verifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM internal_users
      WHERE internal_users.id = auth.uid()
      AND internal_users.role IN ('admin', 'gestor', 'rector')
      AND internal_users.is_active = true
    )
  );

CREATE POLICY "Admins can update verifications"
  ON application_verifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM internal_users
      WHERE internal_users.id = auth.uid()
      AND internal_users.role IN ('admin', 'gestor', 'rector')
      AND internal_users.is_active = true
    )
  );

-- Políticas RLS para application_status_history
ALTER TABLE application_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view status history"
  ON application_status_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM internal_users
      WHERE internal_users.id = auth.uid()
      AND internal_users.role IN ('admin', 'gestor', 'rector')
      AND internal_users.is_active = true
    )
  );

CREATE POLICY "Admins can insert status history"
  ON application_status_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM internal_users
      WHERE internal_users.id = auth.uid()
      AND internal_users.role IN ('admin', 'gestor', 'rector')
      AND internal_users.is_active = true
    )
  );