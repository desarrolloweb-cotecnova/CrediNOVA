import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { studentEmail, studentOTP, cosignerEmail, cosignerOTP } = await req.json();

    if (!studentEmail || !studentOTP || !cosignerEmail || !cosignerOTP) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan parámetros' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Verificar OTP del estudiante
    const { data: studentOTPData, error: studentError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', studentEmail)
      .eq('code', studentOTP)
      .eq('used', false)
      .gt('expires_at', now)
      .maybeSingle();

    if (studentError || !studentOTPData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código del estudiante inválido o expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar OTP del deudor solidario
    const { data: cosignerOTPData, error: cosignerError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', cosignerEmail)
      .eq('code', cosignerOTP)
      .eq('used', false)
      .gt('expires_at', now)
      .maybeSingle();

    if (cosignerError || !cosignerOTPData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Código del deudor solidario inválido o expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Marcar OTPs como usados
    await supabase
      .from('otps')
      .update({ used: true })
      .in('id', [studentOTPData.id, cosignerOTPData.id]);

    return new Response(
      JSON.stringify({ success: true, message: 'Códigos verificados correctamente' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en verify-otp:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
