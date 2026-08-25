import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import type { ClientSession } from '@/lib/useSession';

export default function TopHeader({ session, title }: { session: ClientSession; title: string }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  return (
    <header className="top">
      <div className="brand">
        <img src="/topway-icon.png" alt="Topway Nutrition" className="badge" />
        <div className="brand-text-group">
          <span className="brand-text">Promotor</span>
          <span className="brand-sub">{title}</span>
        </div>
      </div>
      <div className="who" ref={menuRef}>
        <button
          type="button"
          className="who-trigger"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span>{session.name}</span>
          <span className="chevron">▾</span>
        </button>
        {menuOpen && (
          <div className="dropdown-menu">
            {session.role === 'GESTOR' && (
              <button
                type="button"
                className="dropdown-item"
                onClick={() => {
                  setMenuOpen(false);
                  router.push('/gestor/senha');
                }}
              >
                Trocar senha
              </button>
            )}
            <button type="button" className="dropdown-item" onClick={logout}>
              Sair
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
