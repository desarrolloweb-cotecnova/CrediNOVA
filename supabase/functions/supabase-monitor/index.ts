import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticación con el token del usuario
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verificar que el usuario esté activo en internal_users (cualquier rol)
    const { data: internalUser, error: userError } = await anonClient
      .from('internal_users')
      .select('role, is_active')
      .eq('id', user.id)
      .maybeSingle();

    if (userError || !internalUser) {
      return new Response(JSON.stringify({ error: 'Usuario interno no encontrado' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!internalUser.is_active) {
      return new Response(JSON.stringify({ error: 'Usuario inactivo' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cliente administrativo con service role para llamar las RPCs
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const [dbSizeRes, tableSizeRes, connRes, usersRes, storageRes] = await Promise.all([
      adminClient.rpc('monitor_get_db_size'),
      adminClient.rpc('monitor_get_table_sizes'),
      adminClient.rpc('monitor_get_active_connections'),
      adminClient.rpc('monitor_get_auth_users_count'),
      adminClient.rpc('monitor_get_storage_stats'),
    ]);
    const { data: bucketsRpc } = await adminClient.rpc('monitor_get_buckets');

    return new Response(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        database: {
          total_size_bytes: dbSizeRes.data?.size_bytes ?? 0,
          total_size_pretty: dbSizeRes.data?.size_pretty ?? '0 bytes',
        },
        tables: tableSizeRes.data ?? [],
        connections: {
          active: connRes.data?.active_count ?? 0,
          idle:   connRes.data?.idle_count   ?? 0,
          total:  connRes.data?.total_count  ?? 0,
        },
        auth: {
          total_users:       usersRes.data?.total_users       ?? 0,
          confirmed_users:   usersRes.data?.confirmed_users   ?? 0,
          unconfirmed_users: usersRes.data?.unconfirmed_users ?? 0,
        },
        storage: {
          total_files:       storageRes.data?.total_files       ?? 0,
          total_size_bytes:  storageRes.data?.total_size_bytes  ?? 0,
          total_size_pretty: storageRes.data?.total_size_pretty ?? '0 bytes',
          buckets: bucketsRpc ?? [],
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
