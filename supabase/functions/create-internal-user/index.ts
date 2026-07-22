import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Manejar CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Crear cliente de Supabase con service role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Obtener datos del request (rol opcional; por defecto 'gestor')
    const { email, full_name, password, role: rawRole } = await req.json();
    const role: string = ['admin', 'gestor', 'rector'].includes(rawRole) ? rawRole : 'gestor';

    // Validar campos obligatorios
    if (!email || !full_name || !password) {
      return new Response(
        JSON.stringify({ error: 'Faltan campos requeridos: email, full_name, password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar contraseña
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Crear usuario en auth.users — el trigger handle_new_internal_user
    // leerá el rol desde user_metadata e insertará en internal_users automáticamente
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Leer el registro que el trigger ya creó (o actualizar el rol si el email
    // no es @cotecnova.edu.co y el trigger no lo procesó)
    const { data: existing } = await supabaseAdmin
      .from('internal_users')
      .select()
      .eq('id', authUser.user.id)
      .maybeSingle();

    if (!existing) {
      // Email no institucional: insertar manualmente
      const { error: insertErr } = await supabaseAdmin
        .from('internal_users')
        .insert({ id: authUser.user.id, email, full_name, role, is_active: true });

      if (insertErr) {
        await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
        return new Response(
          JSON.stringify({ error: insertErr.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else if (existing.role !== role) {
      // El trigger insertó con rol por defecto; actualizar al rol deseado
      await supabaseAdmin
        .from('internal_users')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', authUser.user.id);
    }

    const { data: finalUser } = await supabaseAdmin
      .from('internal_users')
      .select()
      .eq('id', authUser.user.id)
      .single();

    return new Response(
      JSON.stringify({ success: true, user: finalUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-internal-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
