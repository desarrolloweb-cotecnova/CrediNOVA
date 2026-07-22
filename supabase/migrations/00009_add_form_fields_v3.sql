-- Sección A: nuevos campos del estudiante
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS student_document_expedition_date DATE,
  ADD COLUMN IF NOT EXISTS student_birth_date DATE;

-- Sección B: referencia comercial del deudor solidario (Independiente)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS cosigner_commercial_reference_name TEXT,
  ADD COLUMN IF NOT EXISTS cosigner_commercial_reference_phone TEXT;

-- Sección D: día de pago y datos pago cuota inicial (estos últimos ya existen)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS payment_day_of_month SMALLINT
  CHECK (payment_day_of_month IN (1, 15));

COMMENT ON COLUMN applications.student_document_expedition_date IS 'Fecha de expedición del documento del estudiante';
COMMENT ON COLUMN applications.student_birth_date IS 'Fecha de nacimiento del estudiante';
COMMENT ON COLUMN applications.cosigner_commercial_reference_name IS 'Referencia comercial: solo aplica cuando ocupación es Independiente';
COMMENT ON COLUMN applications.cosigner_commercial_reference_phone IS 'Teléfono de la referencia comercial';
COMMENT ON COLUMN applications.payment_day_of_month IS 'Día del mes elegido para pagar las cuotas: 1 o 15';
