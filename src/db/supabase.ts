import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Falla temprano con un mensaje claro si faltan las variables de entorno.
  throw new Error(
    "Faltan las variables de entorno de Supabase. Define VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (.env local o Vercel > Environment Variables).",
  );
}

// Cliente único de Supabase para toda la app. `detectSessionInUrl` + `flowType: 'pkce'`
// son necesarios para completar el login con Google (OAuth) en /auth/callback.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
});
