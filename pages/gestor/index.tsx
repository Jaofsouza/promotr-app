import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/useSession';
import TopHeader from '@/components/TopHeader';

type Promotor = { id: string; name: string; username: string; createdAt: string };

export default function GestorHome() {
  const { session, loading } = useRequireAuth('GESTOR');
  const router = useRouter();
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  function loadPromotores() {
    setLoadingList(true);
    fetch('/api/promotores')
      .then((r) => r.json())
      .then((data) => setPromotores(Array.isArray(data) ? data : []))
      .finally(() => setLoadingList(false));
  }

  useEffect(() => {
    if (session) loadPromotores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCreating(true);
    const res = await fetch('/api/promotores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(data.error || 'Não foi possível criar');
      return;
    }
    setName(''); setUsername(''); setPassword(''); setShowNew(false);
    loadPromotores();
  }

  if (loading || !session) return <div className="wrap">Carregando...</div>;

  return (
    <div className="wrap">
      <TopHeader session={session} title="Painel do Gestor" />
      <div className="tabs">
        <div className="tab active">Promotores</div>
        <div className="tab" onClick={() => router.push('/gestor/produtos')}>Catálogo de produtos</div>
      </div>

      <div className="section">
        <h2>Promotores cadastrados</h2>
        {loadingList ? (
          <div className="hint">Carregando...</div>
        ) : promotores.length === 0 ? (
          <div className="hint">Nenhum promotor cadastrado ainda.</div>
        ) : (
          <div className="card-list">
            {promotores.map((p) => (
              <Link href={`/gestor/${p.id}`} key={p.id} style={{ textDecoration: 'none' }}>
                <div className="item-row">
                  <div>
                    <div className="item-title">{p.name}</div>
                    <div className="item-sub">@{p.username}</div>
                  </div>
                  <span style={{ color: 'var(--text-dim)' }}>&rsaquo;</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="section">
        {!showNew ? (
          <button className="btn full" onClick={() => setShowNew(true)}>+ Novo promotor</button>
        ) : (
          <form onSubmit={handleCreate}>
            <h2>Novo promotor</h2>
            <label className="field">
              <span className="lbl">Nome completo</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field">
              <span className="lbl">Usuário (login)</span>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required />
            </label>
            <label className="field">
              <span className="lbl">Senha inicial</span>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            {error && <div className="error-msg">{error}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn" type="submit" disabled={creating}>{creating ? 'Criando...' : 'Criar'}</button>
              <button className="btn secondary" type="button" onClick={() => setShowNew(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
