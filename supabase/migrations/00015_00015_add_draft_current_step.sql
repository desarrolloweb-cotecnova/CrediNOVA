-- Agregar columna para guardar el paso actual del borrador
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS draft_current_step INT;