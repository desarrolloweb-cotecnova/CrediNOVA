-- Migración 00015: Crear bucket público para documentos institucionales
-- Bucket para almacenar PDFs y documentos públicos como autorizaciones, términos y condiciones, etc.

-- Nota: El bucket ya fue creado mediante SQL directo, esta migración es solo para documentación
-- y para asegurar que las políticas estén correctamente configuradas

-- Verificar y crear bucket si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'public-documents') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'public-documents',
      'public-documents',
      true,
      10485760, -- 10MB
      ARRAY['application/pdf', 'image/png', 'image/jpeg']
    );
  END IF;
END $$;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Public documents are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload public documents" ON storage.objects;

-- Política para permitir lectura pública
CREATE POLICY "Public documents are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-documents');

-- Política para permitir subida solo a usuarios autenticados (admin)
CREATE POLICY "Authenticated users can upload public documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-documents');

-- Política para permitir actualización solo a usuarios autenticados
CREATE POLICY "Authenticated users can update public documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-documents')
WITH CHECK (bucket_id = 'public-documents');

-- Política para permitir eliminación solo a usuarios autenticados
CREATE POLICY "Authenticated users can delete public documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-documents');

COMMENT ON SCHEMA storage IS 'Bucket public-documents creado para almacenar documentos institucionales públicos como autorizaciones y términos del crédito educativo';
