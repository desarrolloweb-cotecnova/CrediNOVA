-- Permitir 'borrador' y 'cancelado' en applications.status
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'borrador',
    'en_revision',
    'requiere_ajustes',
    'aprobado',
    'pendiente_firma',
    'matricula_autorizada',
    'rechazado',
    'cancelado'
  ));

-- Cambiar el default a 'borrador' para registros recién creados como draft
ALTER TABLE applications ALTER COLUMN status SET DEFAULT 'borrador';