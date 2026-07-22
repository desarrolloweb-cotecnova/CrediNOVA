-- Agregar columnas para cuota inicial y número de cuotas
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS initial_payment NUMERIC,
ADD COLUMN IF NOT EXISTS number_of_installments INTEGER;