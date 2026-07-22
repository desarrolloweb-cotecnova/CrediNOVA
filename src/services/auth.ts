import { supabase } from '@/lib/supabase';
import type { InternalUser } from '@/types/application';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  success: boolean;
  user?: InternalUser;
  error?: string;
}

/**
 * Registra un nuevo usuario administrativo
 * Solo permite emails con dominio @cotecnova.edu.co
 * El perfil en internal_users se crea automáticamente mediante trigger
 */
export async function register(credentials: RegisterCredentials): Promise<AuthResponse> {
  try {
    // Paso 1: Validar dominio
    if (!credentials.email.endsWith('@cotecnova.edu.co')) {
      return {
        success: false,
        error: 'Solo se permiten correos del dominio @cotecnova.edu.co',
      };
    }

    // Paso 2: Crear usuario en Supabase Auth
    // El trigger handle_new_internal_user() creará automáticamente el perfil en internal_users
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
      options: {
        data: {
          full_name: credentials.fullName,
        },
        emailRedirectTo: undefined, // No enviar email de confirmación
      },
    });

    if (authError) {
      console.error('Error al registrar usuario:', authError);
      return {
        success: false,
        error: authError.message === 'User already registered'
          ? 'Este correo ya está registrado'
          : 'Error al registrar usuario',
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'No se pudo crear el usuario',
      };
    }

    // Paso 3: Verificar si hay sesión (si no requiere confirmación de email)
    if (!authData.session) {
      return {
        success: true,
        error: 'Usuario creado. Por favor revisa tu correo para confirmar tu cuenta.',
      };
    }

    // Paso 4: Obtener perfil completo usando getCurrentUser()
    // Esto usa las políticas RLS sin recursión
    const user = await getCurrentUser();

    if (!user) {
      return {
        success: false,
        error: 'Usuario creado pero no se pudo cargar el perfil',
      };
    }

    return {
      success: true,
      user,
    };
  } catch (err) {
    console.error('Error en register:', err);
    return {
      success: false,
      error: 'Error al registrar usuario',
    };
  }
}

/**
 * Inicia sesión con credenciales de usuario interno usando Supabase Auth nativo
 */
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  try {
    // Paso 1: Autenticar con Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (authError) {
      console.error('Error de autenticación:', authError);
      return {
        success: false,
        error: authError.message === 'Invalid login credentials' 
          ? 'Credenciales inválidas' 
          : 'Error al iniciar sesión',
      };
    }

    if (!authData.user) {
      return {
        success: false,
        error: 'No se pudo obtener información del usuario',
      };
    }

    // Paso 2: Obtener perfil de internal_users
    const { data: profile, error: profileError } = await supabase
      .from('internal_users')
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .eq('id', authData.user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (profileError) {
      console.error('Error al obtener perfil:', profileError);
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Error al cargar perfil de usuario',
      };
    }

    if (!profile) {
      await supabase.auth.signOut();
      return {
        success: false,
        error: 'Usuario no autorizado o inactivo',
      };
    }

    // Paso 3: Convertir a formato InternalUser
    const user: InternalUser = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    // Paso 4: Guardar usuario en localStorage para acceso rápido
    setCurrentUser(user);

    return {
      success: true,
      user,
    };
  } catch (err) {
    console.error('Error en login:', err);
    return {
      success: false,
      error: 'Error al conectar con el servidor',
    };
  }
}

/**
 * Cierra la sesión del usuario usando Supabase Auth
 */
export async function logout(): Promise<void> {
  try {
    await supabase.auth.signOut();
    localStorage.removeItem('current_user');
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    // Limpiar localStorage de todos modos
    localStorage.removeItem('current_user');
  }
}

/**
 * Obtiene el usuario actual desde Supabase Auth + internal_users
 */
export async function getCurrentUser(): Promise<InternalUser | null> {
  try {
    // Verificar sesión de Supabase
    const { data: { user }, error: sessionError } = await supabase.auth.getUser();

    if (sessionError || !user) {
      localStorage.removeItem('current_user');
      return null;
    }

    // Obtener perfil de internal_users
    const { data: profile, error: profileError } = await supabase
      .from('internal_users')
      .select('id, email, full_name, role, is_active, created_at, updated_at')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (profileError || !profile) {
      console.error('Error al obtener perfil:', profileError);
      return null;
    }

    // Convertir a formato InternalUser
    const internalUser: InternalUser = {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      role: profile.role,
      isActive: profile.is_active,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };

    // Actualizar localStorage
    setCurrentUser(internalUser);

    return internalUser;
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
    return null;
  }
}

/**
 * Obtiene el usuario actual desde localStorage (sin llamada a API)
 * Útil para acceso rápido, pero debe validarse con getCurrentUser() periódicamente
 */
export function getCurrentUserSync(): InternalUser | null {
  const userStr = localStorage.getItem('current_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr) as InternalUser;
  } catch {
    return null;
  }
}

/**
 * Guarda el usuario actual en localStorage
 */
export function setCurrentUser(user: InternalUser): void {
  localStorage.setItem('current_user', JSON.stringify(user));
}

/**
 * Verifica si hay una sesión activa
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return false;
    }

    // Verificar que el usuario esté en internal_users y activo
    const { data: profile } = await supabase
      .from('internal_users')
      .select('is_active')
      .eq('id', session.user.id)
      .maybeSingle();

    return profile?.is_active === true;
  } catch (error) {
    console.error('Error al verificar autenticación:', error);
    return false;
  }
}

/**
 * Obtiene la sesión actual de Supabase
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
