import { supabase } from '@/lib/supabase';

export interface InternalUser {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'gestor' | 'rector';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  full_name: string;
  role?: 'admin' | 'gestor' | 'rector';
  password: string;
}

export interface UpdateUserData {
  full_name?: string;
  email?: string;
  role?: 'admin' | 'gestor' | 'rector';
  is_active?: boolean;
}

/**
 * Obtiene todos los usuarios internos
 */
export async function getAllUsers(): Promise<{ data: InternalUser[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('internal_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting users:', error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error in getAllUsers:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Crea un nuevo usuario interno
 * Nota: La creación de usuario en auth.users debe hacerse a través de una Edge Function
 */
export async function createUser(userData: CreateUserData): Promise<{ data: InternalUser | null; error: Error | null }> {
  try {
    // Llamar a Edge Function para crear usuario en auth.users y internal_users
    const { data, error } = await supabase.functions.invoke('create-internal-user', {
      body: userData
    });

    if (error) {
      console.error('Error creating user:', error);
      const errorMsg = await error?.context?.text();
      return { data: null, error: new Error(errorMsg || error.message) };
    }

    return { data: data.user, error: null };
  } catch (err) {
    console.error('Error in createUser:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Actualiza un usuario interno (nombre, email, rol, estado)
 * Usa Edge Function para actualizar email en auth.users y internal_users
 */
export async function updateUser(
  userId: string,
  userData: UpdateUserData
): Promise<{ data: InternalUser | null; error: Error | null }> {
  try {
    // Siempre usar la Edge Function para garantizar sincronización de auth.users
    const { data, error } = await supabase.functions.invoke('update-internal-user', {
      body: { userId, ...userData },
    });

    if (error) {
      console.error('Error actualizando usuario:', error);
      const errorMsg = await error?.context?.text();
      return { data: null, error: new Error(errorMsg || error.message) };
    }

    return { data: data?.user ?? null, error: null };
  } catch (err) {
    console.error('Error en updateUser:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * Elimina un usuario interno
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error: Error | null }> {
  try {
    // Llamar a Edge Function para eliminar usuario de auth.users y internal_users
    const { error } = await supabase.functions.invoke('delete-internal-user', {
      body: { userId }
    });

    if (error) {
      console.error('Error deleting user:', error);
      const errorMsg = await error?.context?.text();
      return { success: false, error: new Error(errorMsg || error.message) };
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error in deleteUser:', err);
    return { success: false, error: err as Error };
  }
}

/**
 * Restablece la verificación en dos pasos de un usuario (solo admin/rector).
 *
 * Borra sus factores TOTP y cierra sus sesiones, de modo que la próxima vez
 * que inicie sesión deba configurar el segundo factor desde cero. Va por Edge
 * Function porque desenrolar factores ajenos requiere la service_role key.
 */
export async function resetUserMfa(
  userId: string
): Promise<{ success: boolean; removedFactors?: number; error: Error | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('reset-user-mfa', {
      body: { userId },
    });

    if (error) {
      console.error('Error restableciendo 2FA:', error);
      const errorMsg = await error?.context?.text();
      return { success: false, error: new Error(errorMsg || error.message) };
    }

    return { success: true, removedFactors: data?.removedFactors ?? 0, error: null };
  } catch (err) {
    console.error('Error en resetUserMfa:', err);
    return { success: false, error: err as Error };
  }
}

/**
 * Verifica si el usuario actual tiene rol de administrador ('admin' o 'rector')
 */
export async function isAdministrator(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;

    const { data: profile, error } = await supabase
      .from('internal_users')
      .select('role')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !profile) return false;
    return profile.role === 'admin' || profile.role === 'rector';
  } catch (error) {
    console.error('Error al verificar administrador:', error);
    return false;
  }
}
