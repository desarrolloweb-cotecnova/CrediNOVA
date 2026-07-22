// Reexporta el cliente único de Supabase (definido en '@/db/supabase') para
// mantener compatibilidad con los imports existentes ('@/lib/supabase').
// IMPORTANTE: usar una sola instancia evita dos sesiones GoTrue en conflicto.
export { supabase } from '@/db/supabase';
