-- Habilitar extensión pg_cron (necesaria para tareas programadas)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Eliminar el job previo si existía
SELECT cron.unschedule('supabase-keepalive')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'supabase-keepalive'
);

-- Programar keepalive cada 3 días a las 06:00 UTC
-- Llama a monitor_get_db_size() — consulta ligera que activa la BD
SELECT cron.schedule(
  'supabase-keepalive',
  '0 6 */3 * *',
  $$SELECT monitor_get_db_size();$$
);