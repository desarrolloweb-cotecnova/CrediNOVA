-- ============================================================
-- SECTION: SCHEMA
-- ============================================================

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_cron; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pg_cron" WITH SCHEMA "pg_catalog";


--
-- Name: EXTENSION "pg_cron"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pg_cron" IS 'Job scheduler for PostgreSQL';


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS "public";


--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA "public" IS 'Eliminada funcionalidad de carga de documentos - proceso 100% online sin documentos';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "pgcrypto"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "pgcrypto" IS 'cryptographic functions';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";


--
-- Name: EXTENSION "supabase_vault"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "supabase_vault" IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: can_manage_verifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."can_manage_verifications"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM internal_users
    WHERE id = auth.uid()
      AND role = ANY (ARRAY['administrador', 'gestor', 'rector'])
      AND is_active = true
  );
$$;


--
-- Name: get_user_profile("uuid"); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."get_user_profile"("user_id" "uuid") RETURNS TABLE("id" "uuid", "email" "text", "full_name" "text", "role" "text", "is_active" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    iu.id,
    iu.email,
    iu.full_name,
    iu.role,
    iu.is_active
  FROM internal_users iu
  WHERE iu.id = user_id AND iu.is_active = true;
$$;


--
-- Name: FUNCTION "get_user_profile"("user_id" "uuid"); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."get_user_profile"("user_id" "uuid") IS 'Obtiene el perfil de un usuario interno por su ID';


--
-- Name: handle_new_internal_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."handle_new_internal_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Solo procesar emails institucionales
  IF NEW.email LIKE '%@cotecnova.edu.co' THEN
    INSERT INTO public.internal_users (id, email, full_name, role, is_active)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
      -- Leer rol desde metadata si viene del edge function, si no asignar 'gestor'
      CASE
        WHEN NEW.raw_user_meta_data->>'role' IN ('admin', 'gestor', 'rector')
          THEN NEW.raw_user_meta_data->>'role'
        WHEN NEW.email = 'desarrolloweb@cotecnova.edu.co' THEN 'admin'
        WHEN (SELECT COUNT(*) FROM public.internal_users) = 0 THEN 'admin'
        ELSE 'gestor'
      END,
      true
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION "handle_new_internal_user"(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."handle_new_internal_user"() IS 'Trigger que crea automáticamente el perfil en internal_users cuando se registra un usuario con dominio @cotecnova.edu.co';


--
-- Name: is_active_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."is_active_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM internal_users 
    WHERE id = auth.uid() 
    AND is_active = true
  );
$$;


--
-- Name: FUNCTION "is_active_admin"(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."is_active_admin"() IS 'Verifica si el usuario actual es un administrador activo';


--
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_users
    WHERE id = auth.uid()
      AND role IN ('admin', 'rector')
      AND is_active = true
  );
$$;


--
-- Name: FUNCTION "is_admin"(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION "public"."is_admin"() IS 'Función SECURITY DEFINER que verifica si el usuario actual es administrador activo, evitando recursión RLS';


--
-- Name: monitor_get_active_connections(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_active_connections"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'active_count', COUNT(*) FILTER (WHERE state = 'active'),
    'idle_count',   COUNT(*) FILTER (WHERE state = 'idle'),
    'total_count',  COUNT(*)
  ) FROM pg_stat_activity WHERE datname = current_database();
$$;


--
-- Name: monitor_get_auth_users_count(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_auth_users_count"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'total_users',       COUNT(*),
    'confirmed_users',   COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL),
    'unconfirmed_users', COUNT(*) FILTER (WHERE email_confirmed_at IS NULL)
  ) FROM auth.users;
$$;


--
-- Name: monitor_get_buckets(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_buckets"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT COALESCE(json_agg(json_build_object('name', name, 'public', public)), '[]'::json)
  FROM storage.buckets;
$$;


--
-- Name: monitor_get_db_size(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_db_size"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'size_bytes', pg_database_size(current_database()),
    'size_pretty', pg_size_pretty(pg_database_size(current_database()))
  );
$$;


--
-- Name: monitor_get_storage_stats(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_storage_stats"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_build_object(
    'total_files',       COUNT(*),
    'total_size_bytes',  COALESCE(SUM((metadata->>'size')::bigint), 0),
    'total_size_pretty', pg_size_pretty(COALESCE(SUM((metadata->>'size')::bigint), 0))
  ) FROM storage.objects WHERE bucket_id IS NOT NULL;
$$;


--
-- Name: monitor_get_table_sizes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."monitor_get_table_sizes"() RETURNS json
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT json_agg(t) FROM (
    SELECT
      schemaname, tablename,
      pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) AS size_bytes,
      pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS size_pretty,
      pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) AS data_size_bytes,
      pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) AS data_size_pretty
    FROM pg_tables
    WHERE schemaname NOT IN ('pg_catalog','information_schema','pg_toast')
    ORDER BY size_bytes DESC LIMIT 10
  ) t;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: academic_programs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."academic_programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "tuition_amount" numeric(12,2) NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: application_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."application_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "previous_status" "text",
    "new_status" "text" NOT NULL,
    "changed_by" "uuid",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: application_status_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."application_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "previous_status" "text",
    "new_status" "text" NOT NULL,
    "changed_by" "uuid",
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: application_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."application_verifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "section_name" "text" NOT NULL,
    "verification_status" "text" NOT NULL,
    "notes" "text",
    "verified_by" "uuid",
    "verified_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "application_verifications_verification_status_check" CHECK (("verification_status" = ANY (ARRAY['cumple'::"text", 'no_cumple'::"text", 'requiere_aprobacion_rector'::"text", 'autorizado_rector'::"text"])))
);


--
-- Name: applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_code" "text" NOT NULL,
    "cosigner_full_name" "text",
    "cosigner_document_type" "text",
    "cosigner_document_number" "text",
    "cosigner_document_expedition_date" "date",
    "cosigner_birth_date" "date",
    "cosigner_gender" "text",
    "cosigner_marital_status" "text",
    "cosigner_dependents" integer DEFAULT 0,
    "cosigner_address" "text",
    "cosigner_neighborhood" "text",
    "cosigner_city" "text",
    "cosigner_department" "text",
    "cosigner_education_level" "text",
    "cosigner_phone" "text",
    "cosigner_email" "text",
    "cosigner_occupation" "text",
    "cosigner_spouse_name" "text",
    "cosigner_spouse_company" "text",
    "cosigner_spouse_company_address" "text",
    "cosigner_spouse_company_phone" "text",
    "cosigner_company" "text",
    "cosigner_position" "text",
    "cosigner_company_phone" "text",
    "cosigner_company_extension" "text",
    "cosigner_company_city" "text",
    "cosigner_contract_type" "text",
    "cosigner_hire_date" "date",
    "cosigner_income" numeric(12,2),
    "cosigner_monthly_expenses" numeric(12,2),
    "cosigner_family_reference_name" "text",
    "cosigner_family_reference_phone" "text",
    "cosigner_personal_reference_name" "text",
    "cosigner_personal_reference_phone" "text",
    "cosigner_main_supplier_name" "text",
    "cosigner_main_supplier_phone" "text",
    "cosigner_main_client_name" "text",
    "cosigner_main_client_phone" "text",
    "student_full_name" "text",
    "student_document_type" "text",
    "student_document_number" "text",
    "student_phone" "text",
    "student_email" "text",
    "student_address" "text",
    "student_neighborhood" "text",
    "student_program" "text",
    "student_semester" "text",
    "student_shift" "text",
    "student_works" boolean DEFAULT false,
    "student_company_name" "text",
    "student_salary" numeric(12,2),
    "student_company_address" "text",
    "student_company_phone" "text",
    "student_relationship_to_cosigner" "text",
    "credit_study_receipt_number" "text",
    "credit_study_payment_date" "date",
    "credit_study_amount" numeric(12,2),
    "credit_plan" "text",
    "semester_value" numeric(12,2),
    "initial_payment" numeric(12,2),
    "financed_amount" numeric(12,2),
    "student_authorization_accepted" boolean DEFAULT false,
    "cosigner_authorization_accepted" boolean DEFAULT false,
    "status" "text" DEFAULT 'borrador'::"text" NOT NULL,
    "rejection_reason" "text",
    "assigned_to" "uuid",
    "initial_payment_receipt_number" "text",
    "initial_payment_date" "date",
    "initial_payment_amount" numeric(12,2),
    "payment_plan_accepted" boolean DEFAULT false,
    "guarantees_signed" boolean DEFAULT false,
    "guarantees_signed_date" "date",
    "guarantees_observations" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_draft" boolean DEFAULT false,
    "draft_code" "text",
    "student_city" "text",
    "student_department" "text",
    "number_of_installments" integer,
    "draft_current_step" integer,
    "student_document_expedition_date" "date",
    "student_birth_date" "date",
    "cosigner_commercial_reference_name" "text",
    "cosigner_commercial_reference_phone" "text",
    "payment_day_of_month" smallint,
    "cosigner_company_address" "text",
    "zapsign_signed_link" "text",
    "amortization_schedule" "jsonb",
    "zapsign_send_link" "text",
    "zapsign_cosigner_send_link" "text",
    "has_rector_pending" boolean DEFAULT false NOT NULL,
    "deletion_requested_at" timestamp with time zone,
    "deletion_requested_by" "text",
    CONSTRAINT "applications_cosigner_document_type_check" CHECK (("cosigner_document_type" = ANY (ARRAY['CC'::"text", 'CE'::"text"]))),
    CONSTRAINT "applications_credit_plan_check" CHECK (("credit_plan" = ANY (ARRAY['50/50'::"text", '20/80'::"text"]))),
    CONSTRAINT "applications_payment_day_of_month_check" CHECK (("payment_day_of_month" = ANY (ARRAY[1, 15]))),
    CONSTRAINT "applications_status_check" CHECK (("status" = ANY (ARRAY['borrador'::"text", 'en_revision'::"text", 'requiere_ajustes'::"text", 'aprobado'::"text", 'pendiente_firma'::"text", 'matricula_autorizada'::"text", 'rechazado'::"text", 'cancelado'::"text"]))),
    CONSTRAINT "applications_student_document_type_check" CHECK (("student_document_type" = ANY (ARRAY['CC'::"text", 'TI'::"text"]))),
    CONSTRAINT "applications_student_shift_check" CHECK (("student_shift" = ANY (ARRAY['Diurna'::"text", 'Nocturna'::"text", 'Sabatina'::"text"])))
);


--
-- Name: COLUMN "applications"."student_document_expedition_date"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."student_document_expedition_date" IS 'Fecha de expedición del documento del estudiante';


--
-- Name: COLUMN "applications"."student_birth_date"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."student_birth_date" IS 'Fecha de nacimiento del estudiante';


--
-- Name: COLUMN "applications"."cosigner_commercial_reference_name"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."cosigner_commercial_reference_name" IS 'Referencia comercial: solo aplica cuando ocupación es Independiente';


--
-- Name: COLUMN "applications"."cosigner_commercial_reference_phone"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."cosigner_commercial_reference_phone" IS 'Teléfono de la referencia comercial';


--
-- Name: COLUMN "applications"."payment_day_of_month"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."payment_day_of_month" IS 'Día del mes elegido para pagar las cuotas: 1 o 15';


--
-- Name: COLUMN "applications"."cosigner_company_address"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."cosigner_company_address" IS 'Dirección de la empresa donde trabaja el deudor solidario';


--
-- Name: COLUMN "applications"."deletion_requested_at"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."deletion_requested_at" IS 'Momento en que un gestor solicitó la eliminación de esta solicitud. NULL = sin solicitud pendiente.';


--
-- Name: COLUMN "applications"."deletion_requested_by"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN "public"."applications"."deletion_requested_by" IS 'Email del gestor que solicitó la eliminación.';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid",
    "details" "jsonb",
    "ip_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: credit_study_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."credit_study_costs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: internal_users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."internal_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "internal_users_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'gestor'::"text", 'rector'::"text"])))
);


--
-- Name: otps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."otps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "code" "text" NOT NULL,
    "application_code" "text",
    "purpose" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "used" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: payment_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."payment_plans" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "installment_number" integer NOT NULL,
    "due_date" "date" NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "is_paid" boolean DEFAULT false,
    "paid_date" "date",
    "created_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: phone_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS "public"."phone_validations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "application_id" "uuid" NOT NULL,
    "validation_type" "text" NOT NULL,
    "is_verified" boolean DEFAULT false,
    "verification_date" "date",
    "observations" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


--
-- Name: academic_programs academic_programs_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'academic_programs_name_key'
      AND n.nspname = 'public'
      AND c.relname = 'academic_programs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."academic_programs"
    ADD CONSTRAINT "academic_programs_name_key" UNIQUE ("name");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: academic_programs academic_programs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'academic_programs_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'academic_programs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."academic_programs"
    ADD CONSTRAINT "academic_programs_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_history application_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_history_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_history"
    ADD CONSTRAINT "application_history_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_status_history application_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_status_history_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_status_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_status_history"
    ADD CONSTRAINT "application_status_history_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_verifications application_verifications_application_id_section_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_verifications_application_id_section_name_key'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_verifications"
    ADD CONSTRAINT "application_verifications_application_id_section_name_key" UNIQUE ("application_id", "section_name");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_verifications application_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_verifications_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_verifications"
    ADD CONSTRAINT "application_verifications_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications applications_application_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'applications_application_code_key'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_application_code_key" UNIQUE ("application_code");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications applications_draft_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'applications_draft_code_key'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_draft_code_key" UNIQUE ("draft_code");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'applications_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'audit_logs_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: credit_study_costs credit_study_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'credit_study_costs_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'credit_study_costs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."credit_study_costs"
    ADD CONSTRAINT "credit_study_costs_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: credit_study_costs credit_study_costs_year_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'credit_study_costs_year_key'
      AND n.nspname = 'public'
      AND c.relname = 'credit_study_costs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."credit_study_costs"
    ADD CONSTRAINT "credit_study_costs_year_key" UNIQUE ("year");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: internal_users internal_users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'internal_users_email_key'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."internal_users"
    ADD CONSTRAINT "internal_users_email_key" UNIQUE ("email");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: internal_users internal_users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'internal_users_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."internal_users"
    ADD CONSTRAINT "internal_users_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: otps otps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'otps_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'otps'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."otps"
    ADD CONSTRAINT "otps_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: payment_plans payment_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'payment_plans_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'payment_plans'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: phone_validations phone_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'phone_validations_pkey'
      AND n.nspname = 'public'
      AND c.relname = 'phone_validations'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."phone_validations"
    ADD CONSTRAINT "phone_validations_pkey" PRIMARY KEY ("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: idx_academic_programs_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_academic_programs_active" ON "public"."academic_programs" USING "btree" ("is_active") WHERE ("is_active" = true);


--
-- Name: idx_application_status_history_application_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_application_status_history_application_id" ON "public"."application_status_history" USING "btree" ("application_id");


--
-- Name: idx_application_status_history_changed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_application_status_history_changed_at" ON "public"."application_status_history" USING "btree" ("changed_at" DESC);


--
-- Name: idx_application_verifications_application_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_application_verifications_application_id" ON "public"."application_verifications" USING "btree" ("application_id");


--
-- Name: idx_applications_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_applications_code" ON "public"."applications" USING "btree" ("application_code");


--
-- Name: idx_applications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_applications_created_at" ON "public"."applications" USING "btree" ("created_at");


--
-- Name: idx_applications_draft_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_applications_draft_code" ON "public"."applications" USING "btree" ("draft_code") WHERE ("draft_code" IS NOT NULL);


--
-- Name: idx_applications_has_rector_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_applications_has_rector_pending" ON "public"."applications" USING "btree" ("has_rector_pending") WHERE ("has_rector_pending" = true);


--
-- Name: idx_applications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "public"."applications" USING "btree" ("status");


--
-- Name: idx_applications_student_document; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_applications_student_document" ON "public"."applications" USING "btree" ("student_document_number");


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");


--
-- Name: idx_credit_study_costs_year; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_credit_study_costs_year" ON "public"."credit_study_costs" USING "btree" ("year");


--
-- Name: idx_otps_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_otps_code" ON "public"."otps" USING "btree" ("code");


--
-- Name: idx_otps_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_otps_email" ON "public"."otps" USING "btree" ("email");


--
-- Name: idx_otps_expires_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS "idx_otps_expires_at" ON "public"."otps" USING "btree" ("expires_at");


--
-- Name: applications update_applications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER "update_applications_updated_at" BEFORE UPDATE ON "public"."applications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: internal_users update_internal_users_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER "update_internal_users_updated_at" BEFORE UPDATE ON "public"."internal_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: phone_validations update_phone_validations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER "update_phone_validations_updated_at" BEFORE UPDATE ON "public"."phone_validations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();


--
-- Name: application_history application_history_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_history_application_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_history"
    ADD CONSTRAINT "application_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_history application_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_history_changed_by_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_history"
    ADD CONSTRAINT "application_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."internal_users"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_status_history application_status_history_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_status_history_application_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_status_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_status_history"
    ADD CONSTRAINT "application_status_history_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_status_history application_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_status_history_changed_by_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_status_history'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_status_history"
    ADD CONSTRAINT "application_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "auth"."users"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_verifications application_verifications_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_verifications_application_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_verifications"
    ADD CONSTRAINT "application_verifications_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_verifications application_verifications_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'application_verifications_verified_by_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."application_verifications"
    ADD CONSTRAINT "application_verifications_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications applications_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'applications_assigned_to_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."applications"
    ADD CONSTRAINT "applications_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."internal_users"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'audit_logs_user_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."internal_users"("id");
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: internal_users internal_users_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'internal_users_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."internal_users"
    ADD CONSTRAINT "internal_users_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: payment_plans payment_plans_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'payment_plans_application_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'payment_plans'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."payment_plans"
    ADD CONSTRAINT "payment_plans_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: phone_validations phone_validations_application_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE con.conname = 'phone_validations_application_id_fkey'
      AND n.nspname = 'public'
      AND c.relname = 'phone_validations'
  ) THEN
    EXECUTE $pg_schema_sql$
ALTER TABLE ONLY "public"."phone_validations"
    ADD CONSTRAINT "phone_validations_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE CASCADE;
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: internal_users Administradores pueden ver todos los perfiles; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Administradores pueden ver todos los perfiles'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Administradores pueden ver todos los perfiles" ON "public"."internal_users" FOR SELECT TO "authenticated" USING ("public"."is_admin"());
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: POLICY "Administradores pueden ver todos los perfiles" ON "internal_users"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Administradores pueden ver todos los perfiles" ON "public"."internal_users" IS 'Permite que administradores vean todos los perfiles usando función SECURITY DEFINER para evitar recursión';


--
-- Name: application_verifications Admins can delete verifications; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can delete verifications'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can delete verifications" ON "public"."application_verifications" FOR DELETE TO "authenticated" USING ("public"."can_manage_verifications"());
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_status_history Admins can insert status history; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can insert status history'
      AND n.nspname = 'public'
      AND c.relname = 'application_status_history'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can insert status history" ON "public"."application_status_history" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."internal_users"
  WHERE (("internal_users"."id" = "auth"."uid"()) AND ("internal_users"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text", 'rector'::"text"])) AND ("internal_users"."is_active" = true)))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_verifications Admins can insert verifications; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can insert verifications'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can insert verifications" ON "public"."application_verifications" FOR INSERT TO "authenticated" WITH CHECK ("public"."can_manage_verifications"());
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_verifications Admins can update verifications; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can update verifications'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can update verifications" ON "public"."application_verifications" FOR UPDATE TO "authenticated" USING ("public"."can_manage_verifications"());
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_verifications Admins can view all verifications; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can view all verifications'
      AND n.nspname = 'public'
      AND c.relname = 'application_verifications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can view all verifications" ON "public"."application_verifications" FOR SELECT TO "authenticated" USING ("public"."can_manage_verifications"());
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_status_history Admins can view status history; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Admins can view status history'
      AND n.nspname = 'public'
      AND c.relname = 'application_status_history'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Admins can view status history" ON "public"."application_status_history" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."internal_users"
  WHERE (("internal_users"."id" = "auth"."uid"()) AND ("internal_users"."role" = ANY (ARRAY['admin'::"text", 'gestor'::"text", 'rector'::"text"])) AND ("internal_users"."is_active" = true)))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: otps Cualquiera puede actualizar OTPs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Cualquiera puede actualizar OTPs'
      AND n.nspname = 'public'
      AND c.relname = 'otps'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Cualquiera puede actualizar OTPs" ON "public"."otps" FOR UPDATE TO "authenticated", "anon" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications Cualquiera puede crear solicitudes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Cualquiera puede crear solicitudes'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Cualquiera puede crear solicitudes" ON "public"."applications" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: otps Cualquiera puede insertar OTPs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Cualquiera puede insertar OTPs'
      AND n.nspname = 'public'
      AND c.relname = 'otps'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Cualquiera puede insertar OTPs" ON "public"."otps" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: otps Cualquiera puede leer OTPs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Cualquiera puede leer OTPs'
      AND n.nspname = 'public'
      AND c.relname = 'otps'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Cualquiera puede leer OTPs" ON "public"."otps" FOR SELECT TO "authenticated", "anon" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: credit_study_costs Cualquiera puede ver costos de estudio; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Cualquiera puede ver costos de estudio'
      AND n.nspname = 'public'
      AND c.relname = 'credit_study_costs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Cualquiera puede ver costos de estudio" ON "public"."credit_study_costs" FOR SELECT USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: academic_programs Cualquiera puede ver programas activos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Cualquiera puede ver programas activos'
      AND n.nspname = 'public'
      AND c.relname = 'academic_programs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Cualquiera puede ver programas activos" ON "public"."academic_programs" FOR SELECT USING (("is_active" = true));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: internal_users Solo administradores pueden actualizar usuarios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Solo administradores pueden actualizar usuarios'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Solo administradores pueden actualizar usuarios" ON "public"."internal_users" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."internal_users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'rector'::"text"])) AND ("u"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."internal_users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'rector'::"text"])) AND ("u"."is_active" = true)))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications Solo administradores pueden eliminar solicitudes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Solo administradores pueden eliminar solicitudes'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Solo administradores pueden eliminar solicitudes" ON "public"."applications" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."internal_users"
  WHERE (("internal_users"."id" = "auth"."uid"()) AND ("internal_users"."role" = 'administrador'::"text") AND ("internal_users"."is_active" = true)))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: internal_users Solo administradores pueden eliminar usuarios; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Solo administradores pueden eliminar usuarios'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Solo administradores pueden eliminar usuarios" ON "public"."internal_users" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."internal_users" "u"
  WHERE (("u"."id" = "auth"."uid"()) AND ("u"."role" = ANY (ARRAY['admin'::"text", 'rector'::"text"])) AND ("u"."is_active" = true)))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: academic_programs Solo usuarios autenticados pueden actualizar programas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Solo usuarios autenticados pueden actualizar programas'
      AND n.nspname = 'public'
      AND c.relname = 'academic_programs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Solo usuarios autenticados pueden actualizar programas" ON "public"."academic_programs" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: academic_programs Solo usuarios autenticados pueden eliminar programas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Solo usuarios autenticados pueden eliminar programas'
      AND n.nspname = 'public'
      AND c.relname = 'academic_programs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Solo usuarios autenticados pueden eliminar programas" ON "public"."academic_programs" FOR DELETE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: credit_study_costs Solo usuarios autenticados pueden gestionar costos; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Solo usuarios autenticados pueden gestionar costos'
      AND n.nspname = 'public'
      AND c.relname = 'credit_study_costs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Solo usuarios autenticados pueden gestionar costos" ON "public"."credit_study_costs" TO "authenticated" USING (true) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: academic_programs Solo usuarios autenticados pueden insertar programas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Solo usuarios autenticados pueden insertar programas'
      AND n.nspname = 'public'
      AND c.relname = 'academic_programs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Solo usuarios autenticados pueden insertar programas" ON "public"."academic_programs" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: internal_users Usuario puede leer su propio perfil; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuario puede leer su propio perfil'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuario puede leer su propio perfil" ON "public"."internal_users" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: POLICY "Usuario puede leer su propio perfil" ON "internal_users"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Usuario puede leer su propio perfil" ON "public"."internal_users" IS 'Permite que cada usuario autenticado lea su propia fila en internal_users sin recursión';


--
-- Name: internal_users Usuarios autenticados pueden crear su propio perfil; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios autenticados pueden crear su propio perfil'
      AND n.nspname = 'public'
      AND c.relname = 'internal_users'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios autenticados pueden crear su propio perfil" ON "public"."internal_users" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: POLICY "Usuarios autenticados pueden crear su propio perfil" ON "internal_users"; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON POLICY "Usuarios autenticados pueden crear su propio perfil" ON "public"."internal_users" IS 'Permite que usuarios autenticados en auth.users creen su registro en internal_users durante el proceso de registro. Esta es la única política de INSERT necesaria.';


--
-- Name: academic_programs Usuarios autenticados pueden ver todos los programas; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios autenticados pueden ver todos los programas'
      AND n.nspname = 'public'
      AND c.relname = 'academic_programs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios autenticados pueden ver todos los programas" ON "public"."academic_programs" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications Usuarios internos activos pueden actualizar solicitudes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos activos pueden actualizar solicitudes'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos activos pueden actualizar solicitudes" ON "public"."applications" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."internal_users"
  WHERE (("internal_users"."id" = "auth"."uid"()) AND ("internal_users"."is_active" = true))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."internal_users"
  WHERE (("internal_users"."id" = "auth"."uid"()) AND ("internal_users"."is_active" = true)))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications Usuarios internos activos pueden ver solicitudes; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos activos pueden ver solicitudes'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos activos pueden ver solicitudes" ON "public"."applications" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."internal_users"
  WHERE (("internal_users"."id" = "auth"."uid"()) AND ("internal_users"."is_active" = true)))));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: payment_plans Usuarios internos pueden actualizar planes de pago; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden actualizar planes de pago'
      AND n.nspname = 'public'
      AND c.relname = 'payment_plans'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden actualizar planes de pago" ON "public"."payment_plans" FOR UPDATE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: phone_validations Usuarios internos pueden actualizar validaciones; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden actualizar validaciones'
      AND n.nspname = 'public'
      AND c.relname = 'phone_validations'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden actualizar validaciones" ON "public"."phone_validations" FOR UPDATE TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_history Usuarios internos pueden insertar historial; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden insertar historial'
      AND n.nspname = 'public'
      AND c.relname = 'application_history'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden insertar historial" ON "public"."application_history" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs Usuarios internos pueden insertar logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden insertar logs'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden insertar logs" ON "public"."audit_logs" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: payment_plans Usuarios internos pueden insertar planes de pago; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden insertar planes de pago'
      AND n.nspname = 'public'
      AND c.relname = 'payment_plans'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden insertar planes de pago" ON "public"."payment_plans" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: phone_validations Usuarios internos pueden insertar validaciones; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden insertar validaciones'
      AND n.nspname = 'public'
      AND c.relname = 'phone_validations'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden insertar validaciones" ON "public"."phone_validations" FOR INSERT TO "authenticated" WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: application_history Usuarios internos pueden ver historial; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden ver historial'
      AND n.nspname = 'public'
      AND c.relname = 'application_history'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden ver historial" ON "public"."application_history" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: audit_logs Usuarios internos pueden ver logs; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden ver logs'
      AND n.nspname = 'public'
      AND c.relname = 'audit_logs'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden ver logs" ON "public"."audit_logs" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: payment_plans Usuarios internos pueden ver planes de pago; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden ver planes de pago'
      AND n.nspname = 'public'
      AND c.relname = 'payment_plans'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden ver planes de pago" ON "public"."payment_plans" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: phone_validations Usuarios internos pueden ver validaciones; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios internos pueden ver validaciones'
      AND n.nspname = 'public'
      AND c.relname = 'phone_validations'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios internos pueden ver validaciones" ON "public"."phone_validations" FOR SELECT TO "authenticated" USING (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications Usuarios pueden consultar sus solicitudes con código y documen; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios pueden consultar sus solicitudes con código y documen'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios pueden consultar sus solicitudes con código y documen" ON "public"."applications" FOR SELECT TO "authenticated", "anon" USING ((("application_code" IS NOT NULL) AND ("student_document_number" IS NOT NULL)));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications Usuarios pueden finalizar borradores con código; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios pueden finalizar borradores con código'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios pueden finalizar borradores con código" ON "public"."applications" FOR UPDATE TO "authenticated", "anon" USING ((("is_draft" = true) AND ("draft_code" IS NOT NULL))) WITH CHECK (true);
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: applications Usuarios pueden recuperar borradores con código; Type: POLICY; Schema: public; Owner: -
--

DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Usuarios pueden recuperar borradores con código'
      AND n.nspname = 'public'
      AND c.relname = 'applications'
  ) THEN
    EXECUTE $pg_schema_sql$
CREATE POLICY "Usuarios pueden recuperar borradores con código" ON "public"."applications" FOR SELECT TO "authenticated", "anon" USING ((("is_draft" = true) AND ("draft_code" IS NOT NULL)));
$pg_schema_sql$;
  END IF;
END
$pg_schema_restore$;


--
-- Name: academic_programs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."academic_programs" ENABLE ROW LEVEL SECURITY;

--
-- Name: application_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."application_history" ENABLE ROW LEVEL SECURITY;

--
-- Name: application_status_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."application_status_history" ENABLE ROW LEVEL SECURITY;

--
-- Name: application_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."application_verifications" ENABLE ROW LEVEL SECURITY;

--
-- Name: applications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."applications" ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;

--
-- Name: credit_study_costs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."credit_study_costs" ENABLE ROW LEVEL SECURITY;

--
-- Name: internal_users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."internal_users" ENABLE ROW LEVEL SECURITY;

--
-- Name: otps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."otps" ENABLE ROW LEVEL SECURITY;

--
-- Name: payment_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."payment_plans" ENABLE ROW LEVEL SECURITY;

--
-- Name: phone_validations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE "public"."phone_validations" ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




-- ============================================================
-- SECTION: DIFF FILTER OBJECTS
-- ============================================================
-- Objects that match diff-filter.json but cannot be represented
-- precisely by pg_dump --filter.

-- auth.users trigger: on_auth_user_created
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND t.tgname = 'on_auth_user_created'
      AND n.nspname = 'auth'
      AND c.relname = 'users'
  ) THEN
    EXECUTE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_internal_user();';
  END IF;
END
$pg_schema_restore$;
-- policy: "Authenticated users can upload public documents" on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Authenticated users can upload public documents'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Authenticated users can upload public documents" ON storage.objects AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK ((bucket_id = ''public-documents''::text));';
  END IF;
END
$pg_schema_restore$;
-- policy: "Public documents are publicly accessible" on storage.objects
DO $pg_schema_restore$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class c ON c.oid = pol.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE pol.polname = 'Public documents are publicly accessible'
      AND n.nspname = 'storage'
      AND c.relname = 'objects'
  ) THEN
    EXECUTE 'CREATE POLICY "Public documents are publicly accessible" ON storage.objects AS PERMISSIVE FOR SELECT TO PUBLIC USING ((bucket_id = ''public-documents''::text));';
  END IF;
END
$pg_schema_restore$;

-- ============================================================
-- SECTION: STORAGE BUCKETS DATA
-- ============================================================

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id", "type") VALUES ('public-documents', 'public-documents', NULL, '2026-05-14 22:49:46.931832+00', '2026-05-14 22:49:46.931832+00', 'true', 'false', '10485760', '{application/pdf,image/png,image/jpeg}', NULL, 'STANDARD') ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "owner" = EXCLUDED."owner", "created_at" = EXCLUDED."created_at", "updated_at" = EXCLUDED."updated_at", "public" = EXCLUDED."public", "avif_autodetection" = EXCLUDED."avif_autodetection", "file_size_limit" = EXCLUDED."file_size_limit", "allowed_mime_types" = EXCLUDED."allowed_mime_types", "owner_id" = EXCLUDED."owner_id", "type" = EXCLUDED."type";
