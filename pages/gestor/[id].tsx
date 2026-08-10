import { useEffect, useState, Fragment } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/lib/useSession';
import TopHeader from '@/components/TopHeader';

type Promotor = { id: string; name: string; username: string };
type Report = {
  id: string; local: string; data: string; movimento?: string; aceitacao?: string;
  textoFinal: string; createdAt: string;
};
type AgendaRow = { id: string; data: string; local: string; horaIni: string; horaFim: string; observacao?: string | null };

function formatDateBR(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export default function PromotorProfile() {
  const { session, loading } = useRequireAuth('GESTOR');
  const router = useRouter();
  const { id } = router.query;

  const [promotor, setPromotor] = useState<Promotor | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [agenda, setAgenda] = useState<AgendaRow[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'historico' | 'agenda'>('agenda');

  const [newLocal, setNewLocal] = useState('');
  const [newData, setNewData] = useState('');
  const [newIni, setNewIni] = useState('');
  const [newFim, setNewFim] = useState('');
  const [newObs, setNewObs] = useState('');
  const [savingItem, setSavingItem] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function loadAll(promotorId: string) {
    fetch(`/api/promotores/${promotorId}`).then((r) => r.json()).then(setPromotor);
    fetch(`/api/reports?promotorId=${promotorId}`).then((r) => r.json()).then((d) => setReports(Array.isArray(d) ? d : []));
    fetch(`/api/agenda?promotorId=${promotorId}`).then((r) => r.json()).then((d) => setAgenda(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    if (session && typeof id === 'string') loadAll(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, id]);

  function resetForm() {
    setNewLocal(''); setNewData(''); setNewIni(''); setNewFim(''); setNewObs('');
    setEditingId(null);
  }

  async function handleAddOrEdit(e: React.FormEvent) {
    e.preventDefault();
    if (typeof id !== 'string') return;
    setSavingItem(true);
    if (editingId) {
      await fetch(`/api/agenda/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: newData, local: newLocal, horaIni: newIni, horaFim: newFim, observacao: newObs }),
      });
    } else {
      await fetch('/api/agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotorId: id, data: newData, local: newLocal, horaIni: newIni, horaFim: newFim, observacao: newObs }),
      });
    }
    setSavingItem(false);
    resetForm();
    loadAll(id);
  }

  function startEdit(item: AgendaRow) {
    setEditingId(item.id);
    setNewLocal(item.local);
    setNewData(item.data.slice(0, 10));
    setNewIni(item.horaIni);
    setNewFim(item.horaFim);
    setNewObs(item.observacao || '');
  }

  async function handleDelete(itemId: string) {
    if (typeof id !== 'string') return;
    if (!confirm('Remover este item da agenda?')) return;
    await fetch(`/api/agenda/${itemId}`, { method: 'DELETE' });
    loadAll(id);
  }

  if (loading || !session || !promotor) return <div className="wrap">Carregando...</div>;

  const sortedAgenda = [...agenda].sort((a, b) => a.data.localeCompare(b.data));

  return (
    <div className="wrap-wide">
      <TopHeader session={session} title="Painel do Gestor" />
      <button className="btn secondary small" onClick={() => router.push('/gestor')} style={{ marginBottom: 14 }}>
        &larr; voltar
      </button>

      <div className="section" style={{ marginBottom: 18 }}>
        <h2>{promotor.name}</h2>
        <div className="hint">@{promotor.username}</div>
      </div>

      <div className="tabs">
        <div className={`tab ${subTab === 'agenda' ? 'active' : ''}`} onClick={() => setSubTab('agenda')}>Agenda</div>
        <div className={`tab ${subTab === 'historico' ? 'active' : ''}`} onClick={() => setSubTab('historico')}>Histórico de relatórios</div>
      </div>

      {subTab === 'agenda' && (
        <>
          <div className="section">
            <h2>{editingId ? 'Editar item da agenda' : 'Adicionar à agenda'}</h2>
            <form onSubmit={handleAddOrEdit}>
              <label className="field">
                <span className="lbl">Local</span>
                <input type="text" value={newLocal} onChange={(e) => setNewLocal(e.target.value)} required />
              </label>
              <div className="row3">
                <label className="field">
                  <span className="lbl">Data</span>
                  <input type="date" value={newData} onChange={(e) => setNewData(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="lbl">Início</span>
                  <input type="time" value={newIni} onChange={(e) => setNewIni(e.target.value)} required />
                </label>
                <label className="field">
                  <span className="lbl">Fim</span>
                  <input type="time" value={newFim} onChange={(e) => setNewFim(e.target.value)} required />
                </label>
              </div>
              <label className="field">
                <span className="lbl">Observação (opcional)</span>
                <input type="text" value={newObs} onChange={(e) => setNewObs(e.target.value)} placeholder="ex: a confirmar" />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button className="btn" type="submit" disabled={savingItem}>
                  {savingItem ? 'Salvando...' : editingId ? 'Salvar alteração' : 'Adicionar'}
                </button>
                {editingId && <button className="btn secondary" type="button" onClick={resetForm}>Cancelar</button>}
              </div>
            </form>
          </div>

          <div className="section">
            <h2>Semana</h2>
            {sortedAgenda.length === 0 ? (
              <div className="hint">Nenhum item na agenda ainda.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Data</th><th>Local</th><th>Horário</th><th>Obs.</th><th></th></tr>
                </thead>
                <tbody>
                  {sortedAgenda.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDateBR(item.data)}</td>
                      <td>{item.local}</td>
                      <td>{item.horaIni} às {item.horaFim}</td>
                      <td>{item.observacao || '—'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn secondary small" onClick={() => startEdit(item)} style={{ marginRight: 6 }}>editar</button>
                        <button className="btn secondary small" onClick={() => handleDelete(item.id)}>remover</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {subTab === 'historico' && (
        <div className="section">
          <h2>Relatórios enviados</h2>
          {reports.length === 0 ? (
            <div className="hint">Nenhum relatório registrado ainda.</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Data</th><th>Local</th><th>Movimento</th><th>Aceitação</th><th></th></tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <Fragment key={r.id}>
                    <tr>
                      <td>{formatDateBR(r.data)}</td>
                      <td>{r.local}</td>
                      <td>{r.movimento || '—'}</td>
                      <td>{r.aceitacao || '—'}</td>
                      <td>
                        <button className="btn secondary small" onClick={() => setExpandedReport(expandedReport === r.id ? null : r.id)}>
                          {expandedReport === r.id ? 'ocultar' : 'ver texto'}
                        </button>
                      </td>
                    </tr>
                    {expandedReport === r.id && (
                      <tr>
                        <td colSpan={5}>
                          <div className="receipt">{r.textoFinal}</div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
