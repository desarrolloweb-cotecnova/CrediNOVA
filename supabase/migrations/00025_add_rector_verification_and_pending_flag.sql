-- 1. Agregar nuevo valor al tipo de verificación
ALTER TABLE application_verifications
  DROP CONSTRAINT IF EXISTS application_verifications_verification_status_check;

ALTER TABLE application_verifications
  ADD CONSTRAINT application_verifications_verification_status_check
  CHECK (verification_status IN ('cumple', 'no_cumple', 'requiere_aprobacion_rector', 'autorizado_rector'));

-- 2. Agregar columna has_rector_pending a applications
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS has_rector_pending boolean NOT NULL DEFAULT false;

-- 3. Índice para acelerar queries de solicitudes pendientes rector
CREATE INDEX IF NOT EXISTS idx_applications_has_rector_pending
  ON applications (has_rector_pending)
  WHERE has_rector_pending = true;
