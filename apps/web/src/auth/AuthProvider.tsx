import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

type AuthState =
  { status: 'loading' } | { status: 'signedOut' } | { status: 'signedIn'; userId: string };

interface AuthApi {
  state: AuthState;
  /** False when the Supabase URL and key aren't configured. */
  configured: boolean;
  signInWithGoogle: () => Promise<string | null>;
  /** Local development only. Resolves to an error message, or null on success. */
  signInWithPassword: (email: string, password: string, create: boolean) => Promise<string | null>;
  signOut: () => Promise<void>;
}

// The last signed-in user is remembered so the app opens (and captures) with no network at all.
const CACHE_KEY = 'regain.userId';

const readCache = (): string | null => {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
};
const writeCache = (userId: string | null) => {
  try {
    if (userId) localStorage.setItem(CACHE_KEY, userId);
    else localStorage.removeItem(CACHE_KEY);
  } catch {
    // Private mode: the live session still works.
  }
};

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    if (!supabase) {
      setState({ status: 'signedOut' });
      return;
    }
    let active = true;
    const apply = (userId: string | null) => {
      if (!active) return;
      writeCache(userId);
      setState(userId ? { status: 'signedIn', userId } : { status: 'signedOut' });
    };

    supabase.auth
      .getSession()
      .then(({ data }) => {
        const cached = readCache();
        if (data.session) apply(data.session.user.id);
        else if (cached) setState({ status: 'signedIn', userId: cached });
        else apply(null);
      })
      .catch(() => {
        const cached = readCache();
        if (cached) setState({ status: 'signedIn', userId: cached });
        else apply(null);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') apply(null);
      else if (session) apply(session.user.id);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return "Sign-in isn't set up yet.";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    return error ? "Google sign-in isn't available yet. Please try again later." : null;
  }, []);

  const signInWithPassword = useCallback(
    async (email: string, password: string, create: boolean) => {
      if (!supabase) return "Sign-in isn't set up yet.";
      const { error } = create
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      return error ? error.message : null;
    },
    [],
  );

  const signOut = useCallback(async () => {
    writeCache(null);
    await supabase?.auth.signOut();
    setState({ status: 'signedOut' });
  }, []);

  const value = useMemo(
    () => ({ state, configured: supabase !== null, signInWithGoogle, signInWithPassword, signOut }),
    [state, signInWithGoogle, signInWithPassword, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
