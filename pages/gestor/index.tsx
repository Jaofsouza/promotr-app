import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/lib/useSession';
import TopHeader from '@/components/TopHeader';
import BrandFooter from '@/components/BrandFooter';

type Promotor = { id: string; name: string; username: string; createdAt: string };
type AgendaHojeItem = { id: string; promotorId: string; data: string; local: string; horaIni: string; horaFim: string };

function formatHora(h: string) {
  return h?.slice(0, 5) || h;
}

export default function GestorHome() {
  const { session, loading } = useRequireAuth('GESTOR');
  const router = useRouter();
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [agendaHoje, setAgendaHoje] = useState<AgendaHojeItem[] | null>(null);

  // criar novo
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  // gerenciar existente
  const [manageId, setManageId] = useState<string | null>(null);
  const [mName, setMName] = useState('');
  const [mUsername, setMUsername] = useState('');
  const [mPassword, setMPassword] = useState('');
  const [mError, setMError] = useState('');
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!session) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    fetch(`/api/agenda?from=${start.toISOString()}&to=${end.toISOString()}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((items) => setAgendaHoje(Array.isArray(items) ? items : []))
      .catch(() => setAgendaHoje([]));
  }, [session]);

  const promotorNomeById = useMemo(() => {
    const map: Record<string, string> = {};
    promotores.forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [promotores]);

  const promotoresEmCampo = useMemo(() => {
    if (!agendaHoje) return 0;
    return new Set(agendaHoje.map((a) => a.promotorId)).size;
  }, [agendaHoje]);

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

  function openManage(p: Promotor) {
    setManageId(p.id);
    setMName(p.name);
    setMUsername(p.username);
    setMPassword('');
    setMError('');
  }

  function closeManage() {
    setManageId(null);
    setMError('');
  }

  async function handleSave(e: React.FormEvent, id: string) {
    e.preventDefault();
    setMError('');
    setSaving(true);
    const body: Record<string, string> = { name: mName, username: mUsername };
    if (mPassword.trim()) body.password = mPassword.trim();
    const res = await fetch(`/api/promotores/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMError(data.error || 'Não foi possível salvar');
      return;
    }
    closeManage();
    loadPromotores();
  }

  async function handleDelete(id: string, nome: string) {
    if (!confirm(`Excluir o promotor "${nome}"? Essa ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/promotores/${id}`, { method: 'DELETE' });
    if (res.status === 204) {
      closeManage();
      loadPromotores();
      return;
    }
    const data = await res.json().catch(() => ({}));
    setMError(data.error || 'Não foi possível excluir');
  }

  if (loading || !session) return <div className="wrap">Carregando...</div>;

  return (
    <div className="wrap">
      <TopHeader session={session} title="Painel do Gestor" />
      <div className="tabs">
        <div className="tab active">Promotores</div>
        <div className="tab" onClick={() => router.push('/gestor/produtos')}>Catálogo de produtos</div>
        <div className="tab" onClick={() => router.push('/gestor/agenda')}>Agenda</div>
      </div>

      <div className="stat-row">
        <div className="stat-tile">
          <div className="lbl">Degustações hoje</div>
          <div className="val">{agendaHoje ? agendaHoje.length : '—'}</div>
          <div className="sub">{agendaHoje && agendaHoje.length === 0 ? 'nenhuma agenda lançada ainda' : 'itens na agenda de hoje'}</div>
        </div>
        <div className="stat-tile">
          <div className="lbl">Promotores em campo</div>
          <div className="val">{agendaHoje ? promotoresEmCampo : '—'}</div>
          <div className="sub">de {promotores.length} cadastrado{promotores.length === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="section">
        <h2>Agenda de hoje</h2>
        {!agendaHoje ? (
          <div className="hint">Carregando...</div>
        ) : agendaHoje.length === 0 ? (
          <div className="hint">Nenhuma degustação agendada para hoje.</div>
        ) : (
          <div className="card-list">
            {agendaHoje
              .slice()
              .sort((a, b) => a.horaIni.localeCompare(b.horaIni))
              .map((item) => (
                <div className="item-row" key={item.id}>
                  <div>
                    <div className="item-title">{formatHora(item.horaIni)} · {item.local}</div>
                    <div className="item-sub">{promotorNomeById[item.promotorId] || 'Promotor'}</div>
                  </div>
                </div>
              ))}
          </div>
        )}
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
              <div key={p.id}>
                <div className="item-row">
                  <div
                    style={{ cursor: 'pointer', flex: 1 }}
                    onClick={() => router.push(`/gestor/${p.id}`)}
                  >
                    <div className="item-title">{p.name}</div>
                    <div className="item-sub">@{p.username}</div>
                  </div>
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => (manageId === p.id ? closeManage() : openManage(p))}
                  >
                    {manageId === p.id ? 'Fechar' : 'Gerenciar'}
                  </button>
                </div>

                {manageId === p.id && (
                  <form onSubmit={(e) => handleSave(e, p.id)} style={{ padding: '8px 0 4px' }}>
                    <label className="field">
                      <span className="lbl">Nome completo</span>
                      <input type="text" value={mName} onChange={(e) => setMName(e.target.value)} required />
                    </label>
                    <label className="field">
                      <span className="lbl">Usuário (login)</span>
                      <input type="text" value={mUsername} onChange={(e) => setMUsername(e.target.value)} required />
                    </label>
                    <label className="field">
                      <span className="lbl">Nova senha (deixe em branco para manter a atual)</span>
                      <input
                        type="text"
                        value={mPassword}
                        onChange={(e) => setMPassword(e.target.value)}
                        placeholder="Digite só se quiser trocar"
                      />
                    </label>
                    {mError && <div className="error-msg">{mError}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                      <button className="btn" type="submit" disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</button>
                      <button className="btn secondary" type="button" onClick={() => handleDelete(p.id, p.name)}>Excluir</button>
                    </div>
                  </form>
                )}
              </div>
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
      <BrandFooter />
    </div>
  );
}
