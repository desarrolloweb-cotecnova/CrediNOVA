-- Crear tabla de usuarios internos
CREATE TABLE internal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrador', 'gestor', 'aprobador')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de solicitudes
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_code TEXT UNIQUE NOT NULL,
  
  -- Datos del Deudor Solidario
  cosigner_full_name TEXT NOT NULL,
  cosigner_document_type TEXT NOT NULL CHECK (cosigner_document_type IN ('CC', 'CE')),
  cosigner_document_number TEXT NOT NULL,
  cosigner_document_expedition_date DATE NOT NULL,
  cosigner_birth_date DATE NOT NULL,
  cosigner_gender TEXT NOT NULL,
  cosigner_marital_status TEXT NOT NULL,
  cosigner_dependents INTEGER DEFAULT 0,
  cosigner_address TEXT NOT NULL,
  cosigner_neighborhood TEXT NOT NULL,
  cosigner_city TEXT NOT NULL,
  cosigner_department TEXT NOT NULL,
  cosigner_education_level TEXT NOT NULL,
  cosigner_phone TEXT NOT NULL,
  cosigner_email TEXT NOT NULL,
  cosigner_occupation TEXT NOT NULL,
  cosigner_spouse_name TEXT,
  cosigner_spouse_company TEXT,
  cosigner_spouse_company_address TEXT,
  cosigner_spouse_company_phone TEXT,
  cosigner_company TEXT,
  cosigner_position TEXT,
  cosigner_company_phone TEXT,
  cosigner_company_extension TEXT,
  cosigner_company_city TEXT,
  cosigner_contract_type TEXT,
  cosigner_hire_date DATE,
  cosigner_income NUMERIC(12, 2),
  cosigner_monthly_expenses NUMERIC(12, 2),
  cosigner_family_reference_name TEXT NOT NULL,
  cosigner_family_reference_phone TEXT NOT NULL,
  cosigner_personal_reference_name TEXT NOT NULL,
  cosigner_personal_reference_phone TEXT NOT NULL,
  cosigner_main_supplier_name TEXT,
  cosigner_main_supplier_phone TEXT,
  cosigner_main_client_name TEXT,
  cosigner_main_client_phone TEXT,
  
  -- Datos del Estudiante
  student_full_name TEXT NOT NULL,
  student_document_type TEXT NOT NULL CHECK (student_document_type IN ('CC', 'TI')),
  student_document_number TEXT NOT NULL,
  student_phone TEXT NOT NULL,
  student_email TEXT NOT NULL,
  student_address TEXT NOT NULL,
  student_neighborhood TEXT NOT NULL,
  student_program TEXT NOT NULL,
  student_semester TEXT NOT NULL,
  student_shift TEXT NOT NULL CHECK (student_shift IN ('Diurna', 'Nocturna', 'Sabatina')),
  student_works BOOLEAN DEFAULT false,
  student_company_name TEXT,
  student_salary NUMERIC(12, 2),
  student_company_address TEXT,
  student_company_phone TEXT,
  student_relationship_to_cosigner TEXT NOT NULL,
  
  -- Información del Pago del Estudio de Crédito
  credit_study_receipt_number TEXT NOT NULL,
  credit_study_payment_date DATE NOT NULL,
  credit_study_amount NUMERIC(12, 2) NOT NULL,
  
  -- Plan de Crédito
  credit_plan TEXT NOT NULL CHECK (credit_plan IN ('50/50', '20/80')),
  semester_value NUMERIC(12, 2) NOT NULL,
  initial_payment NUMERIC(12, 2),
  financed_amount NUMERIC(12, 2),
  
  -- Autorizaciones
  student_authorization_accepted BOOLEAN DEFAULT false,
  cosigner_authorization_accepted BOOLEAN DEFAULT false,
  
  -- Estado y seguimiento
  status TEXT NOT NULL DEFAULT 'en_revision' CHECK (status IN ('en_revision', 'requiere_ajustes', 'aprobado', 'pendiente_firma', 'matricula_autorizada', 'rechazado')),
  rejection_reason TEXT,
  assigned_to UUID REFERENCES internal_users(id),
  
  -- Pago de cuota inicial
  initial_payment_receipt_number TEXT,
  initial_payment_date DATE,
  initial_payment_amount NUMERIC(12, 2),
  payment_plan_accepted BOOLEAN DEFAULT false,
  
  -- Garantías
  guarantees_signed BOOLEAN DEFAULT false,
  guarantees_signed_date DATE,
  guarantees_observations TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de historial de solicitudes
CREATE TABLE application_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES internal_users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de validaciones telefónicas
CREATE TABLE phone_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  validation_type TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verification_date DATE,
  observations TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de OTPs
CREATE TABLE otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  application_code TEXT,
  purpose TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de logs de auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES internal_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear tabla de plan de pagos
CREATE TABLE payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  is_paid BOOLEAN DEFAULT false,
  paid_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crear índices
CREATE INDEX idx_applications_code ON applications(application_code);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_student_document ON applications(student_document_number);
CREATE INDEX idx_applications_created_at ON applications(created_at);
CREATE INDEX idx_otps_email ON otps(email);
CREATE INDEX idx_otps_code ON otps(code);
CREATE INDEX idx_otps_expires_at ON otps(expires_at);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_internal_users_updated_at BEFORE UPDATE ON internal_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_validations_updated_at BEFORE UPDATE ON phone_validations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();