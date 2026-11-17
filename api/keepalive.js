// Keepalive de Supabase (Vercel Cron).
//
// Supabase pausa los proyectos del plan Free tras ~7 días sin actividad EXTERNA
// (peticiones a la API / conexiones). Un job de pg_cron dentro de la propia base
// de datos NO cuenta como actividad, y además deja de ejecutarse en cuanto el
// proyecto se pausa. Por eso el ping debe venir desde fuera: esta función la
// llama Vercel Cron todos los días (ver `crons` en vercel.json) y hace una
// consulta real a la base de datos a través de la API REST de Supabase.

export async function GET(request) {
  // Si se define CRON_SECRET en Vercel, Vercel Cron envía
  // "Authorization: Bearer <CRON_SECRET>" y rechazamos cualquier otra llamada.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return Response.json({ ok: false, error: "No autorizado" }, { status: 401 });
  }

  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return Response.json(
      { ok: false, error: "Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en Vercel" },
      { status: 500 },
    );
  }

  const started = Date.now();
  try {
    // Consulta mínima a una tabla legible por `anon` (RLS: programas activos).
    const res = await fetch(`${url}/rest/v1/academic_programs?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    const body = await res.text();
    const result = {
      ok: res.ok,
      status: res.status,
      ms: Date.now() - started,
      timestamp: new Date().toISOString(),
    };
    if (!res.ok) {
      console.error("[keepalive] Supabase respondió con error", res.status, body.slice(0, 300));
      return Response.json({ ...result, error: body.slice(0, 300) }, { status: 502 });
    }
    console.log("[keepalive] OK", result);
    return Response.json(result);
  } catch (err) {
    console.error("[keepalive] Error de red", err);
    return Response.json({ ok: false, error: String(err) }, { status: 502 });
  }
}
