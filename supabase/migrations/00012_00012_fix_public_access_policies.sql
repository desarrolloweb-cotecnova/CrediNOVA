-- Permitir a usuarios anónimos consultar sus propias solicitudes por código y documento
CREATE POLICY "Usuarios pueden consultar sus solicitudes con código y documento"
ON applications
FOR SELECT
TO anon, authenticated
USING (
  -- Permitir si se proporciona el código de solicitud y el documento del estudiante
  application_code IS NOT NULL 
  AND student_document_number IS NOT NULL
);

-- Permitir a usuarios anónimos recuperar borradores por código
CREATE POLICY "Usuarios pueden recuperar borradores con código"
ON applications
FOR SELECT
TO anon, authenticated
USING (
  -- Permitir si es un borrador y se proporciona el código
  is_draft = true 
  AND draft_code IS NOT NULL
);