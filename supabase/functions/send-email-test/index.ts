import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Construye un `from` válido para Resend a partir del secret RESEND_FROM_EMAIL.
 *
 * Resend rechaza el envío (422 validation_error) si el campo no tiene la forma
 * `correo@dominio` o `Nombre <correo@dominio>`. Dos casos lo rompían:
 *
 *  1. El secret ya venía como `Nombre <correo@dominio>`: al anteponerle otro
 *     nombre quedaba `X <Nombre <correo@dominio>>`, que es inválido.
 *  2. El nombre visible llevaba un guion largo «–» (U+2013). Un display name
 *     sin comillas debe ser ASCII; si no, hay que entrecomillarlo.
 *
 * Aquí se respeta el valor si ya trae nombre, y si es solo un correo se le
 * antepone un nombre entrecomillado y en ASCII.
 */
function buildFrom(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '"CrediNOVA - Cotecnova" <onboarding@resend.dev>';
  // Ya viene como «Nombre <correo@dominio>»: usarlo tal cual.
  if (/<[^<>@\s]+@[^<>@\s]+>\s*$/.test(v)) return v;
  // Solo el correo: anteponer un nombre visible entrecomillado (ASCII).
  return `"CrediNOVA - Cotecnova" <${v}>`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
  const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'creditoycartera@cotecnova.edu.co';
    const FROM_ADDRESS = buildFrom(FROM_EMAIL);
    console.log('[from] remitente efectivo:', FROM_ADDRESS);

  // Estado de las variables de entorno (sin exponer el valor real)
  const envStatus = {
    hasApiKey: Boolean(RESEND_API_KEY),
    hasFromEmail: Boolean(Deno.env.get('RESEND_FROM_EMAIL')),
    fromEmail: FROM_EMAIL,
  };

  if (!RESEND_API_KEY) {
    console.error('[send-email-test] RESEND_API_KEY no está configurada');
    return new Response(
      JSON.stringify({
        success: false,
        error: 'RESEND_API_KEY no configurada en los secretos de la función',
        envStatus,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const to: string = body?.to || '';

    if (!to || !to.includes('@')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Dirección "to" inválida o no proporcionada', envStatus }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Prueba CrediNOVA</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden;">
        <tr><td style="padding:28px 32px 20px;border-bottom:1px solid #f1f5f9;">
          <span style="font-family: Arial, Helvetica, sans-serif; font-size: 20px; font-weight: 700; letter-spacing: 0.2px;"><span style="color:#006134;">Credi</span><span style="color:#F06C14;">NOVA</span></span>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 12px;color:#374151;">Este es un <strong>correo de prueba</strong> del sistema CrediNOVA.</p>
          <p style="margin:0 0 16px;color:#374151;">Si recibes este mensaje, la integración con Resend está funcionando correctamente. ✅</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin:16px 0;">
            <tr><td style="padding:14px 18px;">
              <p style="margin:0;font-size:13px;color:#166534;">Remitente: <strong>${FROM_EMAIL}</strong></p>
              <p style="margin:6px 0 0;font-size:13px;color:#166534;">Enviado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f8f9fb;padding:16px 32px;border-top:1px solid #f1f5f9;text-align:center;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">CrediNOVA – Corporación de Estudios Tecnológicos del Norte del Valle</p>
          <p style="margin:4px 0 0;font-size:11px;color:#d1d5db;">Correo de prueba automático – no responder</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [to],
        subject: '✅ Prueba de correo – CrediNOVA',
        html,
      }),
    });

    const resendText = await resendResponse.text();

    if (!resendResponse.ok) {
      console.error('[send-email-test] Error de Resend HTTP', resendResponse.status, ':', resendText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Resend respondió con HTTP ${resendResponse.status}`,
          detail: resendText,
          envStatus,
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let resendData: Record<string, unknown> = {};
    try {
      resendData = JSON.parse(resendText);
    } catch {
      resendData = { raw: resendText };
    }

    console.log(`[send-email-test] OK → to:${to} id:${resendData.id}`);

    return new Response(
      JSON.stringify({ success: true, id: resendData.id, envStatus }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[send-email-test] Excepción:', msg);
    return new Response(
      JSON.stringify({ success: false, error: msg, envStatus }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
