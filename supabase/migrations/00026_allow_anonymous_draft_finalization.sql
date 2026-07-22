-- Política para que usuarios anónimos puedan actualizar/finalizar sus propios borradores
-- USING: solo aplica a filas que actualmente son borrador con código
-- WITH CHECK: permite el resultado (sea sigue borrador o pasa a en_revision)
CREATE POLICY "Usuarios pueden finalizar borradores con código"
ON applications
FOR UPDATE
TO anon, authenticated
USING (
  is_draft = true
  AND draft_code IS NOT NULL
)
WITH CHECK (true);

-- Política para que usuarios anónimos puedan actualizar borradores (guardar pasos)
-- Ya existía el SELECT para borradores, pero faltaba el UPDATE
-- La política anterior cubre ambos casos (guardar borrador y finalizar)