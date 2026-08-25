import { useRouter } from 'next/router';
import type { ClientSession } from '@/lib/useSession';

export default function TopHeader({ session, title }: { session: ClientSession; title: string }) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="top">
      <div className="brand">
        <img src="/topway-icon.png" alt="Topway Nutrition" className="badge" />
        <div className="brand-text-group">
          <span className="brand-text">Promotr</span>
          <span className="brand-sub">{title}</span>
        </div>
      </div>
      <div className="who">
        <span>{session.name}</span>
        <button className="linklike" onClick={logout}>sair</button>
      </div>
    </header>
  );
}
