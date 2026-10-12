import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session } from '@supabase/supabase-js';
import Login from '@/pages/Login';
import AdminDashboard from '@/pages/AdminDashboard';

/** True when the signed-in user has a row in admin_users. RLS lets every user read their own row. */
async function isAdminUser(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data !== null;
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  // The user id whose admin_users row was found. Compared with the current session's
  // user id on every render, so a session switch can never reuse a stale result.
  const [verifiedAdminId, setVerifiedAdminId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Every session must belong to an admin: a fresh login, a session restored from
  // storage, or a session switched by another sign-in. Non-admins are signed out.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      setVerifiedAdminId(null);
      return;
    }
    let cancelled = false;
    (async () => {
      let admin: boolean | null = null;
      try {
        admin = await isAdminUser(userId);
      } catch {
        admin = null; // query failed (network, expired token)
      }
      if (cancelled) return;
      if (admin === true) {
        setVerifiedAdminId(userId);
        return;
      }
      toast.error(
        admin === false
          ? 'Erişim reddedildi. Admin yetkiniz yok.'
          : 'Yetki kontrolü başarısız. Lütfen tekrar deneyin.',
      );
      // Local scope only: a failed check must not revoke this admin's sessions on other devices.
      await supabase.auth.signOut({ scope: 'local' });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const authed = session !== null && userId !== null && verifiedAdminId === userId;

  if (loading || (session && !authed)) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route path="/login" element={authed ? <Navigate to="/" /> : <Login />} />
        <Route path="/*" element={authed ? <AdminDashboard /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
