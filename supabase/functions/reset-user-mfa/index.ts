// Restablece la verificación en dos pasos (TOTP) de otro usuario.
//
// Un usuario solo puede desenrolar sus propios factores desde el cliente
// (`supabase.auth.mfa.unenroll`), así que resetear el 2FA ajeno exige la
// service_role key. De ahí esta función.
//
// Además de borrar los factores, se cierran las sesiones del usuario: si se
// restablece el 2FA porque perdió el teléfono o se lo comprometieron, dejar
// vivas sus sesiones actuales (que ya están en AAL2) anularía el propósito.
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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    // ── 1. Identificar a quien llama ────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const { data: { user }, error: authError } = await createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    ).auth.getUser();

    if (authError || !user?.id) {
      return new Response(
        JSON.stringify({ error: 'No autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 2. Solo admin/rector activos pueden restablecer el 2FA de otros ─────
    const { data: callerProfile } = await supabaseAdmin
      .from('internal_users')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!callerProfile || !['admin', 'rector'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Solo los administradores o rectores pueden restablecer la verificación en dos pasos' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { userId } = await req.json();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 3. Comprobar que el usuario objetivo existe ─────────────────────────
    const { data: target } = await supabaseAdmin
      .from('internal_users')
      .select('email')
      .eq('id', userId)
      .maybeSingle();

    if (!target) {
      return new Response(
        JSON.stringify({ error: 'El usuario no existe' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── 4. Borrar sus factores TOTP ─────────────────────────────────────────
    const { data: factorList, error: listError } =
      await supabaseAdmin.auth.admin.mfa.listFactors({ userId });

    if (listError) {
      console.error('Error listando factores:', listError);
      return new Response(
        JSON.stringify({ error: listError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const factors = factorList?.factors ?? [];
    for (const f of factors) {
      const { error: delError } = await supabaseAdmin.auth.admin.mfa.deleteFactor({
        userId,
        id: f.id,
      });
      if (delError) {
        console.error('Error eliminando factor:', delError);
        return new Response(
          JSON.stringify({ error: delError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // ── 5. Cerrar sus sesiones para que el reset surta efecto de inmediato ──
    // `auth.admin.signOut()` no sirve aquí: recibe el JWT del propio usuario,
    // no un userId. Se usa la función SECURITY DEFINER de la migración 00036,
    // cuyo permiso de ejecución es exclusivo de service_role.
    const { error: revokeError } = await supabaseAdmin.rpc('admin_revoke_user_sessions', {
      target_user_id: userId,
    });
    if (revokeError) {
      // No es fatal: los factores ya se borraron y en el próximo inicio de
      // sesión se exigirá enrolar de nuevo.
      console.warn('No se pudieron cerrar las sesiones:', revokeError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: target.email,
        removedFactors: factors.length,
        message: factors.length > 0
          ? 'Verificación en dos pasos restablecida'
          : 'El usuario no tenía verificación en dos pasos configurada',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Error en reset-user-mfa:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
