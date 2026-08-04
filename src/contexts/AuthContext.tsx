import { createContext, useContext, useEffect, useState, useRef, useCallback, type ReactNode } from 'react';
import { supabase } from '@/db/supabase';
import type { User } from '@supabase/supabase-js';
import type { InternalUser, UserRole } from '@/types/application';
import { setCurrentUser } from '@/services/auth';
import { toast } from 'sonner';
import { useSessionExpiry } from '@/hooks/use-session-expiry';
import {
  LOGIN_PATH,
  SESSION_EXPIRED_PARAM,
  clearStoredStart,
  getSessionExpiry,
  isSessionExpired,
} from '@/lib/session-policy';

const ALLOWED_DOMAIN = '@cotecnova.edu.co';

/**
 * Mantiene sincronizado el caché en localStorage ('current_user') que consumen
 * algunas pantallas vía `getCurrentUserSync()`. Solo se cachea el perfil activo.
 */
function syncCurrentUserCache(p: InternalUser | null) {
  if (p && p.isActive) {
    setCurrentUser(p);
  } else {
    localStorage.removeItem('current_user');
  }
}

/** Roles con acceso administrativo completo (equivalentes a admin). */
export const FULL_ACCESS_ROLES: UserRole[] = ['admin', 'rector'];

/**
 * Obtiene el perfil interno del usuario desde `internal_users`.
 * El trigger `handle_new_internal_user` crea la fila automáticamente en el
 * primer inicio de sesión con Google (para correos @cotecnova.edu.co).
 */
export async function getProfile(userId: string): Promise<InternalUser | null> {
  const { data, error } = await supabase
    .from('internal_users')
    .select('id, email, full_name, role, is_active, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error al obtener el perfil de usuario:', error);
    return null;
  }
  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    role: data.role as UserRole,
    isActive: data.is_active,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

interface AuthContextType {
  user: User | null;
  profile: InternalUser | null;
  loading: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  /** true si el usuario tiene rol admin o rector. */
  isAdmin: boolean;
  /** true si el perfil existe y está activo. */
  isActive: boolean;
  /**
   * Momento (epoch ms) en que caduca la sesión y habrá que volver a iniciarla;
   * null si no hay sesión. Ver `SESSION_MAX_HOURS` en lib/session-policy.
   */
  sessionExpiresAt: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<InternalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);

  // Evita actualizaciones duplicadas cuando onAuthStateChange se dispara varias
  // veces para el mismo usuario (SIGNED_IN + TOKEN_REFRESHED, etc.).
  const currentUserIdRef = useRef<string | null>(null);

  // Evita que la expulsión por caducidad se dispare dos veces (el temporizador
  // y la comprobación al recuperar el foco pueden coincidir).
  const expiringRef = useRef(false);

  /**
   * Cierra la sesión caducada y devuelve al usuario al login.
   *
   * Se recarga la página en lugar de navegar con el router: así no queda en
   * memoria ningún dato del panel de la sesión anterior.
   */
  const expireSession = useCallback(async () => {
    if (expiringRef.current) return;
    expiringRef.current = true;

    currentUserIdRef.current = null;
    clearStoredStart();
    syncCurrentUserCache(null);
    await supabase.auth.signOut();

    window.location.replace(`${LOGIN_PATH}?${SESSION_EXPIRED_PARAM}=1`);
  }, []);

  useSessionExpiry(user, expireSession);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      syncCurrentUserCache(null);
      return;
    }
    const p = await getProfile(user.id);
    setProfile(p);
    syncCurrentUserCache(p);
  };

  useEffect(() => {
    // onAuthStateChange emite INITIAL_SESSION de inmediato con la sesión actual,
    // por lo que no hace falta una llamada separada a getSession().
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser: User | null = session?.user ?? null;
      const newId = sessionUser?.id ?? null;

      // Sesión que supera la ventana máxima (p. ej. una pestaña que quedó
      // abierta desde ayer): se cierra antes de dar acceso a nada. Va antes del
      // filtro de disparos duplicados para cubrir también los TOKEN_REFRESHED
      // que llegan al despertar el equipo.
      if (sessionUser && isSessionExpired(sessionUser)) {
        void expireSession();
        return;
      }

      // Ignorar disparos duplicados para el mismo usuario.
      if (newId === currentUserIdRef.current) {
        if (loading) setLoading(false);
        return;
      }
      currentUserIdRef.current = newId;

      // Restringir el acceso solo a correos institucionales @cotecnova.edu.co.
      if (sessionUser?.email && !sessionUser.email.endsWith(ALLOWED_DOMAIN)) {
        supabase.auth.signOut();
        toast.error('Acceso restringido. Solo se permiten correos @cotecnova.edu.co');
        currentUserIdRef.current = null;
        setUser(null);
        setProfile(null);
        syncCurrentUserCache(null);
        setLoading(false);
        return;
      }

      setUser(sessionUser);
      setSessionExpiresAt(sessionUser ? getSessionExpiry(sessionUser) : null);

      if (sessionUser) {
        getProfile(sessionUser.id).then(p => {
          setProfile(p);
          syncCurrentUserCache(p);
          setLoading(false);
        });
      } else {
        setProfile(null);
        syncCurrentUserCache(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            hd: 'cotecnova.edu.co',
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    currentUserIdRef.current = null;
    clearStoredStart();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setSessionExpiresAt(null);
    syncCurrentUserCache(null);
  };

  const isAdmin = profile?.role === 'admin' || profile?.role === 'rector';
  const isActive = profile?.isActive === true;

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      signInWithGoogle, signOut, refreshProfile,
      isAdmin, isActive, sessionExpiresAt,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
