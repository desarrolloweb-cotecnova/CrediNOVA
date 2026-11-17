-- Restringe las funciones de monitoreo (SECURITY DEFINER) creadas en la 00028.
--
-- PostgreSQL concede EXECUTE a PUBLIC por defecto y Supabase además lo concede
-- a `anon` y `authenticated` en el esquema public, por lo que cualquier visitante
-- sin sesión podía llamarlas vía /rest/v1/rpc/... (p. ej. contar auth.users,
-- listar tablas, buckets y conexiones).
--
-- Solo las usa la Edge Function `supabase-monitor`, que valida al usuario interno
-- y luego las invoca con la service role. El job de pg_cron (00029) corre como
-- `postgres` (propietario), así que tampoco se ve afectado.

DO $$
DECLARE
  fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'monitor_get_db_size()',
    'monitor_get_table_sizes()',
    'monitor_get_active_connections()',
    'monitor_get_auth_users_count()',
    'monitor_get_storage_stats()',
    'monitor_get_buckets()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;
