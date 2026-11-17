-- NOTA: este job interno NO evita por sí solo la pausa del plan Free de Supabase
-- (la pausa se decide por actividad externa y pg_cron no corre con el proyecto
-- pausado). El keepalive efectivo es externo: api/keepalive.js (Vercel Cron) y
-- .github/workflows/supabase-keepalive.yml. Se conserva como complemento.

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