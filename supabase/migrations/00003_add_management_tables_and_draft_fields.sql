-- Tabla para gestionar valores de estudio de crédito por año
CREATE TABLE IF NOT EXISTS credit_study_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL UNIQUE,
  amount numeric(12, 2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla para gestionar programas académicos
CREATE TABLE IF NOT EXISTS academic_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tuition_amount numeric(12, 2) NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agregar campos de borrador a applications
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS is_draft boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS draft_code text UNIQUE;

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_credit_study_costs_year ON credit_study_costs(year);
CREATE INDEX IF NOT EXISTS idx_academic_programs_active ON academic_programs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_applications_draft_code ON applications(draft_code) WHERE draft_code IS NOT NULL;

-- RLS Policies para credit_study_costs
ALTER TABLE credit_study_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver costos de estudio"
  ON credit_study_costs FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Solo usuarios autenticados pueden gestionar costos"
  ON credit_study_costs FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies para academic_programs
ALTER TABLE academic_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cualquiera puede ver programas activos"
  ON academic_programs FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Usuarios autenticados pueden ver todos los programas"
  ON academic_programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Solo usuarios autenticados pueden insertar programas"
  ON academic_programs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Solo usuarios autenticados pueden actualizar programas"
  ON academic_programs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Solo usuarios autenticados pueden eliminar programas"
  ON academic_programs FOR DELETE
  TO authenticated
  USING (true);

-- Insertar datos iniciales
INSERT INTO credit_study_costs (year, amount) VALUES
  (2026, 12628.00),
  (2025, 12000.00)
ON CONFLICT (year) DO NOTHING;

INSERT INTO academic_programs (name, tuition_amount, is_active) VALUES
  ('Contaduría Pública', 2919576.00, true),
  ('Tecnología en Gestión Contable', 2386553.00, true),
  ('Administración de Empresas', 2800000.00, true),
  ('Ingeniería de Sistemas', 3200000.00, true)
ON CONFLICT (name) DO NOTHING;