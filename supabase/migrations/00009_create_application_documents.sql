-- Migración 00009: Crear tabla para documentos de solicitudes con Cloudinary
-- Almacena referencias a documentos subidos a Cloudinary para cada solicitud

-- Crear tipo ENUM para tipos de documentos
CREATE TYPE document_type AS ENUM (
  'cedula_estudiante',
  'certificado_matricula',
  'cedula_codeudor',
  'comprobante_ingresos',
  'recibo_servicios',
  'carta_laboral',
  'declaracion_renta',
  'extracto_bancario',
  'otro'
);

-- Crear tipo ENUM para categoría del documento
CREATE TYPE document_category AS ENUM (
  'estudiante',
  'codeudor'
);

-- Crear tabla de documentos
CREATE TABLE application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  document_category document_category NOT NULL,
  
  -- Información de Cloudinary
  cloudinary_public_id text NOT NULL,
  cloudinary_url text NOT NULL,
  cloudinary_secure_url text NOT NULL,
  
  -- Metadata del archivo
  file_name text NOT NULL,
  file_size integer NOT NULL, -- en bytes
  file_format text NOT NULL, -- pdf, jpg, png, etc.
  
  -- Información de carga
  uploaded_by uuid REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  
  -- Metadata adicional
  notes text,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_application_documents_application_id ON application_documents(application_id);
CREATE INDEX idx_application_documents_document_type ON application_documents(document_type);
CREATE INDEX idx_application_documents_document_category ON application_documents(document_category);
CREATE INDEX idx_application_documents_uploaded_by ON application_documents(uploaded_by);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_application_documents_updated_at
  BEFORE UPDATE ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Políticas RLS
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios públicos pueden subir documentos para sus solicitudes
CREATE POLICY "Usuarios pueden subir documentos a sus solicitudes"
ON application_documents
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_id
    AND applications.status != 'borrador'
  )
);

-- Política: Usuarios pueden ver documentos de sus propias solicitudes
CREATE POLICY "Usuarios pueden ver documentos de sus solicitudes"
ON application_documents
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM applications
    WHERE applications.id = application_id
  )
);

-- Política: Usuarios internos activos pueden ver todos los documentos
CREATE POLICY "Usuarios internos pueden ver todos los documentos"
ON application_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM internal_users
    WHERE internal_users.id = auth.uid()
    AND internal_users.is_active = true
  )
);

-- Política: Solo administradores pueden eliminar documentos
CREATE POLICY "Solo administradores pueden eliminar documentos"
ON application_documents
FOR DELETE
TO authenticated
USING (public.is_admin());

-- Comentarios
COMMENT ON TABLE application_documents IS 'Almacena referencias a documentos subidos a Cloudinary para cada solicitud de crédito';
COMMENT ON COLUMN application_documents.cloudinary_public_id IS 'ID público del archivo en Cloudinary (usado para transformaciones y eliminación)';
COMMENT ON COLUMN application_documents.cloudinary_url IS 'URL pública del archivo en Cloudinary';
COMMENT ON COLUMN application_documents.cloudinary_secure_url IS 'URL segura (HTTPS) del archivo en Cloudinary';
COMMENT ON COLUMN application_documents.file_size IS 'Tamaño del archivo en bytes';
COMMENT ON COLUMN application_documents.document_type IS 'Tipo específico de documento (cédula, certificado, etc.)';
COMMENT ON COLUMN application_documents.document_category IS 'Categoría del documento (estudiante o codeudor)';
