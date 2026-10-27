import { createContext, useContext, useEffect, useState } from 'react';
import { DEMO, supabase } from './supabase';
import { PROJECT } from '@/project';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

/* vai trò → quyền (khớp RLS trong cms-supabase) */
export const CAN = {
  content: ['owner', 'editor'],
  publish: ['owner', 'editor'],
  head: ['owner'],
  leadSettings: ['owner'],
  leads: ['owner', 'sales'],
  members: ['owner'],
  audit: ['owner'],
  dashboard: ['owner', 'editor', 'sales', 'viewer'],
};

/**
 * Đăng nhập Google qua Supabase. Sau khi đăng nhập, kiểm tra email có trong cms_members của dự án này.
 * state: loading | anon | denied | error | ok
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [state, setState] = useState('loading');
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    if (DEMO) { setSession({ user: { email: 'demo@localhost' } }); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const email = session?.user?.email?.toLowerCase();
  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setAccessError(''); setRole(null); setState('anon'); return; }
    if (DEMO) { setRole('owner'); setState('ok'); return; }
    let alive = true;
    setState('loading');
    supabase.from('cms_members').select('role').eq('project_id', PROJECT.id).eq('email', email).maybeSingle()
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) {
          setAccessError(error.message);
          setRole(null);
          setState('error');
          return;
        }
        setAccessError('');
        setRole(data?.role || null);
        setState(data?.role ? 'ok' : 'denied');
      })
      .catch((error) => {
        if (!alive) return;
        setAccessError(error instanceof Error ? error.message : String(error));
        setRole(null);
        setState('error');
      });
    return () => { alive = false; };
  }, [email, session === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    state,
    accessError,
    role,
    email,
    user: session?.user,
    can: (perm) => Boolean(role && CAN[perm]?.includes(role)),
    signIn: () => supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin, queryParams: { prompt: 'select_account' } },
    }),
    signOut: () => supabase.auth.signOut(),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
