import { supabase } from '@/lib/supabase';

export type VerificationStatus = 'cumple' | 'no_cumple' | 'requiere_aprobacion_rector' | 'autorizado_rector';

export interface ApplicationVerification {
  id: string;
  application_id: string;
  section_name: 'student' | 'cosigner' | 'payment' | 'plan' | 'initial_payment';
  verification_status: VerificationStatus;
  notes: string | null;
  verified_by: string | null;
  verified_at: string;
  created_at: string;
  updated_at: string;
}

export interface ApplicationStatusHistory {
  id: string;
  application_id: string;
  previous_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
  notes: string | null;
  created_at: string;
}

/**
 * Guarda o actualiza una verificación de sección
 */
export async function saveVerification(
  applicationId: string,
  sectionName: 'student' | 'cosigner' | 'payment' | 'plan' | 'initial_payment',
  verificationStatus: VerificationStatus,
  notes: string
): Promise<{ data: ApplicationVerification | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('Usuario no autenticado') };
    }

    const { error } = await supabase
      .from('application_verifications')
      .upsert({
        application_id: applicationId,
        section_name: sectionName,
        verification_status: verificationStatus,
        notes: notes || null,
        verified_by: user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'application_id,section_name'
      });

    if (error) {
      console.error('Error saving verification:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: null, error: null };
  } catch (err) {
    console.error('Error in saveVerification:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Obtiene todas las verificaciones de una solicitud
 */
export async function getVerifications(
  applicationId: string
): Promise<{ data: ApplicationVerification[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('application_verifications')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting verifications:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getVerifications:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Guarda un cambio de estado en el historial
 */
export async function saveStatusHistory(
  applicationId: string,
  previousStatus: string | null,
  newStatus: string,
  notes?: string
): Promise<{ data: ApplicationStatusHistory | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: new Error('Usuario no autenticado') };
    }

    const { data, error } = await supabase
      .from('application_status_history')
      .insert({
        application_id: applicationId,
        previous_status: previousStatus,
        new_status: newStatus,
        changed_by: user.id,
        changed_at: new Date().toISOString(),
        notes: notes || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving status history:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Error in saveStatusHistory:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Obtiene el historial de estados de una solicitud
 */
export async function getStatusHistory(
  applicationId: string
): Promise<{ data: ApplicationStatusHistory[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('application_status_history')
      .select('*')
      .eq('application_id', applicationId)
      .order('changed_at', { ascending: true });

    if (error) {
      console.error('Error getting status history:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getStatusHistory:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Verifica si todas las secciones cumplen con las validaciones
 */
export function checkAllVerificationsMet(
  verifications: ApplicationVerification[]
): boolean {
  const requiredSections: Array<'student' | 'cosigner' | 'payment' | 'plan' | 'initial_payment'> = [
    'student',
    'cosigner',
    'payment',
    'plan',
    'initial_payment'
  ];

  // Verificar que todas las secciones requeridas tengan verificación
  for (const section of requiredSections) {
    const verification = verifications.find(v => v.section_name === section);
    
    if (!verification) {
      return false; // Falta verificación de esta sección
    }

    // La sección debe estar en "cumple" o "autorizado_rector"
    if (verification.verification_status !== 'cumple' && 
        verification.verification_status !== 'autorizado_rector') {
      return false;
    }
  }

  return true;
}

/**
 * Verifica si hay alguna sección marcada como "no cumple".
 * NOTA: 'requiere_aprobacion_rector' NO se considera incumplimiento.
 */
export function hasAnyNonCompliant(
  verifications: ApplicationVerification[]
): boolean {
  return verifications.some(v => v.verification_status === 'no_cumple');
}

/**
 * Verifica si hay alguna sección pendiente de aprobación del rector.
 */
export function hasRectorPending(
  verifications: ApplicationVerification[]
): boolean {
  return verifications.some(v => v.verification_status === 'requiere_aprobacion_rector');
}

/**
 * Nombre legible de cada sección para notificaciones y mensajes
 */
export const SECTION_LABELS: Record<ApplicationVerification['section_name'], string> = {
  student:          'Información del Estudiante',
  cosigner:         'Información del Deudor Solidario',
  payment:          'Condiciones de Pago',
  plan:             'Plan de Crédito',
  initial_payment:  'Pago Cuota Inicial',
};
