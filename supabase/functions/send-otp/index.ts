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
    const { studentEmail, cosignerEmail } = await req.json();

    if (!studentEmail || !cosignerEmail) {
      return new Response(
        JSON.stringify({ success: false, error: 'Faltan correos electrónicos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generar códigos OTP de 6 dígitos
    const studentOTP = Math.floor(100000 + Math.random() * 900000).toString();
    const cosignerOTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Calcular tiempo de expiración (15 minutos)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Guardar OTPs en la base de datos
    const { error: insertError } = await supabase.from('otps').insert([
      {
        email: studentEmail,
        code: studentOTP,
        purpose: 'application_verification',
        expires_at: expiresAt,
      },
      {
        email: cosignerEmail,
        code: cosignerOTP,
        purpose: 'application_verification',
        expires_at: expiresAt,
      },
    ]);

    if (insertError) {
      console.error('Error al guardar OTPs:', insertError);
      return new Response(
        JSON.stringify({ success: false, error: 'Error al generar códigos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Enviar correos electrónicos con Brevo
    if (brevoApiKey) {
      try {
        // Plantilla HTML para el email
        const getEmailHTML = (otp: string, recipient: string) => `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background-color: #00602F; padding: 30px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">CrediNOVA</h1>
                        <p style="color: #ffffff; margin: 5px 0 0 0; font-size: 14px;">Cotecnova</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding: 40px 30px;">
                        <h2 style="color: #00602F; margin: 0 0 20px 0; font-size: 22px;">Código de Verificación</h2>
                        <p style="color: #333333; margin: 0 0 15px 0; font-size: 16px; line-height: 1.5;">
                          Estimado ${recipient === 'student' ? 'estudiante' : 'deudor solidario'},
                        </p>
                        <p style="color: #333333; margin: 0 0 25px 0; font-size: 16px; line-height: 1.5;">
                          Su código de verificación para completar la solicitud de crédito educativo es:
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center" style="padding: 20px 0;">
                              <div style="background-color: #f8f9fa; border: 2px dashed #00602F; border-radius: 8px; padding: 25px; display: inline-block;">
                                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #00602F; font-family: 'Courier New', monospace;">
                                  ${otp}
                                </span>
                              </div>
                            </td>
                          </tr>
                        </table>
                        <p style="color: #666666; margin: 25px 0 15px 0; font-size: 14px; line-height: 1.5;">
                          <strong>Importante:</strong> Este código expira en 15 minutos.
                        </p>
                        <p style="color: #999999; margin: 0; font-size: 13px; line-height: 1.5;">
                          Si no solicitó este código, puede ignorar este mensaje de forma segura.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8f9fa; padding: 20px 30px; border-top: 1px solid #e0e0e0;">
                        <p style="color: #999999; margin: 0; font-size: 12px; text-align: center; line-height: 1.5;">
                          © ${new Date().getFullYear()} CrediNOVA - Corporación de Estudios Tecnológicos del Norte del Valle
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `;

        // Enviar email al estudiante
        const studentEmailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'CrediNOVA',
              email: 'noreply@cotecnova.edu.co',
            },
            to: [
              {
                email: studentEmail,
                name: 'Estudiante',
              },
            ],
            subject: 'Código de Verificación - CrediNOVA',
            htmlContent: getEmailHTML(studentOTP, 'student'),
          }),
        });

        if (!studentEmailResponse.ok) {
          const errorText = await studentEmailResponse.text();
          console.error('Error al enviar email al estudiante:', errorText);
        }

        // Enviar email al deudor solidario
        const cosignerEmailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'api-key': brevoApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sender: {
              name: 'CrediNOVA',
              email: 'noreply@cotecnova.edu.co',
            },
            to: [
              {
                email: cosignerEmail,
                name: 'Deudor Solidario',
              },
            ],
            subject: 'Código de Verificación - CrediNOVA',
            htmlContent: getEmailHTML(cosignerOTP, 'cosigner'),
          }),
        });

        if (!cosignerEmailResponse.ok) {
          const errorText = await cosignerEmailResponse.text();
          console.error('Error al enviar email al deudor solidario:', errorText);
        }

        console.log('Correos enviados exitosamente con Brevo');
      } catch (emailError) {
        console.error('Error al enviar correos con Brevo:', emailError);
        // No fallar la función si el email falla, los códigos ya están en la BD
      }
    } else {
      // Si no hay API key configurada, solo registrar en consola
      console.log('BREVO_API_KEY no configurada. Códigos generados:');
      console.log(`OTP Estudiante (${studentEmail}): ${studentOTP}`);
      console.log(`OTP Deudor (${cosignerEmail}): ${cosignerOTP}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Códigos OTP enviados correctamente',
        // En desarrollo (sin API key), devolver los códigos para facilitar pruebas
        ...(brevoApiKey ? {} : { dev: { studentOTP, cosignerOTP } })
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error en send-otp:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
