import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente con service role para bypass de RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar que el usuario que llama sea administrador por rol (no por email)
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    ).auth.getUser();

    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ error: 'No autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar rol 'admin' o 'rector' en internal_users (ambos pueden aprobar eliminaciones)
    const { data: callerProfile } = await supabaseAdmin
      .from('internal_users')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!callerProfile || !['admin', 'rector'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Solo los administradores o rectores pueden eliminar solicitudes' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { applicationId } = await req.json();

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'applicationId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que la solicitud existe
    const { data: app, error: fetchErr } = await supabaseAdmin
      .from('applications')
      .select('id, application_code')
      .eq('id', applicationId)
      .maybeSingle();

    if (fetchErr || !app) {
      return new Response(
        JSON.stringify({ error: 'Solicitud no encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Eliminar registros relacionados en orden correcto (FK → padre)
    const tables: Array<{ table: string; column: string }> = [
      { table: 'payment_plans',               column: 'application_id' },
      { table: 'phone_validations',            column: 'application_id' },
      { table: 'application_verifications',    column: 'application_id' },
      { table: 'application_status_history',   column: 'application_id' },
    ];

    for (const { table, column } of tables) {
      const { error: delErr } = await supabaseAdmin
        .from(table)
        .delete()
        .eq(column, applicationId);

      if (delErr) {
        console.error(`Error eliminando ${table}:`, delErr);
        return new Response(
          JSON.stringify({ error: `Error al eliminar registros relacionados (${table}): ${delErr.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Eliminar la solicitud principal
    const { error: appDelErr } = await supabaseAdmin
      .from('applications')
      .delete()
      .eq('id', applicationId);

    if (appDelErr) {
      console.error('Error eliminando la solicitud:', appDelErr);
      return new Response(
        JSON.stringify({ error: `Error al eliminar la solicitud: ${appDelErr.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Solicitud ${app.application_code} eliminada correctamente`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en delete-application:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
