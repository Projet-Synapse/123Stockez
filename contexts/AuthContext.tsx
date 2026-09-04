// Powered by OnSpace.AI — Real Supabase Auth Context
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { getSupabaseClient } from '@/template';
import { desktop, isDesktop, isNative } from '@/services/platform';

WebBrowser.maybeCompleteAuthSession();

const OAUTH_SCHEME = 'onspaceapp';

interface AppUser {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: AppUser | null;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  sendOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const sb = getSupabaseClient();
    sb.auth.getSession().then(({ data }) => {
      if (data.session?.user) setUser(sessionToUser(data.session.user));
      setIsLoading(false);
    });
    const { data: listener } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? sessionToUser(session.user) : null);
      setIsLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Desktop OAuth returns through the onspaceapp:// protocol handler rather
  // than an in-window redirect, because Google refuses embedded browsers.
  useEffect(() => {
    const bridge = desktop();
    if (!bridge) return;
    return bridge.onAuthCallback(async (url) => {
      const code = new URL(url).searchParams.get('code');
      if (!code) return;
      const { error } = await getSupabaseClient().auth.exchangeCodeForSession(code);
      if (error) console.warn('[Auth] Échange du code OAuth impossible:', error.message);
    });
  }, []);

  const loginWithGoogle = async () => {
    const sb = getSupabaseClient();

    // Browser: let Supabase drive the redirect in place.
    if (Platform.OS === 'web' && !isDesktop()) {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw new Error(error.message);
      return;
    }

    const redirectTo = isDesktop()
      ? `${OAUTH_SCHEME}://auth`
      : AuthSession.makeRedirectUri({ scheme: OAUTH_SCHEME, path: 'auth' });

    const { data, error } = await sb.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw new Error(error.message);
    if (!data?.url) throw new Error("URL d'authentification Google indisponible");

    // Desktop: hand the URL to the system browser; the protocol handler in
    // desktop/main.js delivers the callback back to the effect above.
    if (isDesktop()) {
      await desktop()?.openExternal(data.url);
      return;
    }

    if (isNative()) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') {
        if (result.type === 'cancel' || result.type === 'dismiss') return;
        throw new Error('Connexion Google interrompue');
      }
      const code = new URL(result.url).searchParams.get('code');
      if (!code) throw new Error("Aucun code d'autorisation reçu");
      const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
      if (exchangeError) throw new Error(exchangeError.message);
    }
  };

  const loginWithPassword = async (email: string, password: string) => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const signUp = async (email: string, password: string): Promise<{ needsConfirmation: boolean }> => {
    const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
    if (error) throw new Error(error.message);
    return { needsConfirmation: !data.session };
  };

  const sendOTP = async (email: string) => {
    const { error } = await getSupabaseClient().auth.signInWithOtp({ email });
    if (error) throw new Error(error.message);
  };

  const verifyOTP = async (email: string, token: string) => {
    const { error } = await getSupabaseClient().auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw new Error(error.message);
  };

  const signOut = async () => {
    await getSupabaseClient().auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, loginWithGoogle, loginWithPassword, signUp, sendOTP, verifyOTP, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function sessionToUser(u: any): AppUser {
  return {
    id: u.id,
    email: u.email ?? '',
    name: u.user_metadata?.full_name ?? u.user_metadata?.name ?? u.email?.split('@')[0] ?? 'Utilisateur',
  };
}
