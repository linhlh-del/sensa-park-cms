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
 * state: loading | anon | denied | ok
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (DEMO) { setSession({ user: { email: 'demo@localhost' } }); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const email = session?.user?.email?.toLowerCase();
  useEffect(() => {
    if (session === undefined) return;
    if (!session) { setRole(null); setState('anon'); return; }
    if (DEMO) { setRole('owner'); setState('ok'); return; }
    let alive = true;
    setState('loading');
    supabase.from('cms_members').select('role').eq('project_id', PROJECT.id).eq('email', email).maybeSingle()
      .then(({ data }) => {
        if (!alive) return;
        setRole(data?.role || null);
        setState(data?.role ? 'ok' : 'denied');
      });
    return () => { alive = false; };
  }, [email, session === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    state,
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
