import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

export type ClientSession = {
  userId: string;
  username: string;
  name: string;
  role: 'PROMOTOR' | 'GESTOR';
};

/** Busca a sessão atual e redireciona pra /login (ou pro painel certo) se não bater com o esperado. */
export function useRequireAuth(requiredRole?: 'PROMOTOR' | 'GESTOR') {
  const router = useRouter();
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        if (!data) {
          router.replace('/login');
          return;
        }
        if (requiredRole && data.role !== requiredRole) {
          router.replace(data.role === 'GESTOR' ? '/gestor' : '/promotor');
          return;
        }
        setSession(data);
        setLoading(false);
      })
      .catch(() => router.replace('/login'));
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, loading };
}
