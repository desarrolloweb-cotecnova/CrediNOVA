-- Agregar columnas de ciudad y departamento para el estudiante
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS student_city TEXT,
ADD COLUMN IF NOT EXISTS student_department TEXT;

-- Establecer valores predeterminados para registros existentes
UPDATE applications
SET student_city = 'Cartago',
    student_department = 'Valle del Cauca'
WHERE student_city IS NULL OR student_department IS NULL;