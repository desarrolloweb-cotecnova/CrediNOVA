-- Hacer nullable todas las columnas excepto las esenciales para permitir borradores parciales
-- Columnas esenciales que permanecen NOT NULL: id, application_code, status, is_draft, created_at, updated_at

-- Deudor Solidario
ALTER TABLE applications ALTER COLUMN cosigner_full_name DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_document_type DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_document_number DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_document_expedition_date DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_birth_date DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_gender DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_marital_status DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_dependents DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_address DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_neighborhood DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_city DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_department DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_education_level DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_phone DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_email DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_occupation DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_family_reference_name DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_family_reference_phone DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_personal_reference_name DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_personal_reference_phone DROP NOT NULL;

-- Estudiante
ALTER TABLE applications ALTER COLUMN student_full_name DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_document_type DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_document_number DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_phone DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_email DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_address DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_neighborhood DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_city DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_department DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_program DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_semester DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_shift DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_works DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN student_relationship_to_cosigner DROP NOT NULL;

-- Pago estudio de crédito
ALTER TABLE applications ALTER COLUMN credit_study_receipt_number DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN credit_study_payment_date DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN credit_study_amount DROP NOT NULL;

-- Plan de crédito
ALTER TABLE applications ALTER COLUMN credit_plan DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN semester_value DROP NOT NULL;

-- Autorizaciones
ALTER TABLE applications ALTER COLUMN student_authorization_accepted DROP NOT NULL;
ALTER TABLE applications ALTER COLUMN cosigner_authorization_accepted DROP NOT NULL;