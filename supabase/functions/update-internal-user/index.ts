import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar que el solicitante es administrador
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authCheckError } = await supabaseAdmin.auth.getUser(token);
    if (authCheckError || !callerUser) {
      return new Response(
        JSON.stringify({ error: 'Sesión inválida' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar que el solicitante tiene rol 'admin' en internal_users
    const { data: callerProfile } = await supabaseAdmin
      .from('internal_users')
      .select('role')
      .eq('id', callerUser.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!callerProfile || !['admin', 'rector'].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Sin permisos de administrador' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, full_name, email, role, is_active } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId es requerido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar rol si fue enviado
    if (role && !['admin', 'gestor', 'rector'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Rol inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar que no se intente cambiar el email del propio administrador activo
    if (email) {
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserById(userId);
      const { data: targetProfile } = await supabaseAdmin
        .from('internal_users')
        .select('role')
        .eq('id', userId)
        .maybeSingle();
      if (existingUser?.user && targetProfile?.role === 'admin' && userId === callerUser.id) {
        return new Response(
          JSON.stringify({ error: 'No se puede modificar el correo del administrador activo' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verificar que el nuevo email no esté en uso
      const { data: emailCheck } = await supabaseAdmin
        .from('internal_users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .maybeSingle();

      if (emailCheck) {
        return new Response(
          JSON.stringify({ error: 'El correo electrónico ya está en uso por otro usuario' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 1. Actualizar en auth.users (email y/o metadatos)
    const authUpdatePayload: Record<string, unknown> = {};
    if (email) authUpdatePayload.email = email;
    if (full_name !== undefined) authUpdatePayload.user_metadata = { full_name };

    if (Object.keys(authUpdatePayload).length > 0) {
      const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        authUpdatePayload
      );
      if (authUpdateError) {
        console.error('Error actualizando auth.users:', authUpdateError);
        return new Response(
          JSON.stringify({ error: authUpdateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // 2. Actualizar en internal_users
    const internalUpdatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (full_name !== undefined) internalUpdatePayload.full_name = full_name;
    if (email) internalUpdatePayload.email = email;
    if (role) internalUpdatePayload.role = role;
    if (is_active !== undefined) internalUpdatePayload.is_active = is_active;

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('internal_users')
      .update(internalUpdatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (updateError) {
      console.error('Error actualizando internal_users:', updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, user: updatedUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error en update-internal-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
