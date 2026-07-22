-- Migración 00016: Agregar columna faltante cosigner_company_address
-- Esta columna es necesaria para almacenar la dirección de la empresa del deudor solidario

ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS cosigner_company_address text;

COMMENT ON COLUMN applications.cosigner_company_address IS 'Dirección de la empresa donde trabaja el deudor solidario';
