-- Columnas para el flujo de solicitud de eliminación por gestor
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deletion_requested_by TEXT;

COMMENT ON COLUMN applications.deletion_requested_at IS 'Momento en que un gestor solicitó la eliminación de esta solicitud. NULL = sin solicitud pendiente.';
COMMENT ON COLUMN applications.deletion_requested_by IS 'Email del gestor que solicitó la eliminación.';