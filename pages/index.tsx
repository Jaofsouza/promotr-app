import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return router.replace('/login');
        router.replace(data.role === 'GESTOR' ? '/gestor' : '/promotor');
      })
      .catch(() => router.replace('/login'));
  }, [router]);
  return null;
}
