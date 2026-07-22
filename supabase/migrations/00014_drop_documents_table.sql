-- Migración 00014: Eliminar tabla de documentos y tipos relacionados
-- Ya no se requiere carga de documentos en el proceso de solicitud

-- Eliminar tabla de documentos
DROP TABLE IF EXISTS application_documents CASCADE;

-- Eliminar tipos ENUM
DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS document_category CASCADE;

COMMENT ON SCHEMA public IS 'Eliminada funcionalidad de carga de documentos - proceso 100% online sin documentos';
