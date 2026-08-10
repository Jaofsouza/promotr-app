import { useEffect, useMemo, useState } from 'react';
import { useRequireAuth } from '@/lib/useSession';
import TopHeader from '@/components/TopHeader';

type Flavor = { id: string; name: string };
type Product = {
  id: string; name: string; matName?: string | null; category: string;
  suggestion?: string | null; defaultQty: number; color: string; flavors: Flavor[];
};
type TasteEntry = { checked: boolean; qty: number; flavor: string };
type CustomItem = { name: string; qty: string };
type AgendaRow = { id: string; data: string; local: string; horaIni: string; horaFim: string; observacao?: string | null };
type SessionInfo = { name: string; role?: string; userId?: string; username?: string };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function formatDateBR(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
function suggestPeak(ini: string, fim: string) {
  if (!ini || !fim) return '';
  const h1 = Number(ini.split(':')[0]);
  const h2 = Number(fim.split(':')[0]);
  const span = h2 - h1;
  if (h1 === 14 && h2 === 18) return '16:00 às 17:00';
  if (h2 >= 12 && h2 <= 14) return `${Math.max(h2 - 1, h1)}:00 às ${h2}:00`;
  if (span >= 6) return '15:00 às 16:00';
  return `${Math.max(h1, h2 - 1)}:00 às ${h2}:00`;
}
const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export default function PromotorHome() {
  const { session, loading } = useRequireAuth('PROMOTOR');
  const [tab, setTab] = useState<'relatorio' | 'agenda'>('relatorio');

  if (loading || !session) return <div className="wrap">Carregando...</div>;

  return (
    <div className="wrap">
      <TopHeader session={session} title="Degustações" />
      <div className="tabs">
        <div className={`tab ${tab === 'relatorio' ? 'active' : ''}`} onClick={() => setTab('relatorio')}>
          Novo relatório
        </div>
        <div className={`tab ${tab === 'agenda' ? 'active' : ''}`} onClick={() => setTab('agenda')}>
          Minha agenda
        </div>
      </div>
      {tab === 'relatorio' ? <ReportForm session={session as SessionInfo} /> : <MyAgenda />}
    </div>
  );
}

function MyAgenda() {
  const [items, setItems] = useState<AgendaRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agenda')
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="section">Carregando agenda...</div>;
  if (items.length === 0) {
    return <div className="section">Sua agenda ainda não foi montada pelo gestor.</div>;
  }

  // Agrupa por dia (pode ter 2 no mesmo dia)
  const byDay: Record<string, AgendaRow[]> = {};
  items.forEach((it) => {
    const key = it.data.slice(0, 10);
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(it);
  });
  const sortedDays = Object.keys(byDay).sort();

  return (
    <div className="section">
      <h2>Sua agenda</h2>
      <div className="week-grid">
        {sortedDays.map((day) => {
          const d = new Date(day + 'T00:00:00');
          const label = `${WEEKDAYS[d.getDay()].slice(0, 3)} ${formatDateBR(day)}`;
          return (
            <div className="day-card" key={day}>
              <div className="day-label">{label}</div>
              {byDay[day].map((slot) => (
                <div className="slot" key={slot.id}>
                  <div className="slot-time">{slot.horaIni} às {slot.horaFim}</div>
                  <div>{slot.local}</div>
                  {slot.observacao && <div className="hint">{slot.observacao}</div>}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReportForm({ session }: { session: SessionInfo }) {
  const [degustacaoProducts, setDegustacaoProducts] = useState<Product[]>([]);
  const [vendaProducts, setVendaProducts] = useState<Product[]>([]);
  const [taste, setTaste] = useState<Record<string, TasteEntry>>({});
  const [saleQty, setSaleQty] = useState<Record<string, Record<string, number>>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [customSales, setCustomSales] = useState<CustomItem[]>([]);

  // Agenda: mapa dia -> lista de degustações agendadas naquele dia
  const [agendaByDay, setAgendaByDay] = useState<Record<string, AgendaRow[]>>({});
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  const [local, setLocal] = useState('');
  const [data, setData] = useState(todayISO());
  const [horaIni, setHoraIni] = useState('');
  const [horaFim, setHoraFim] = useState('');
  const [movimento, setMovimento] = useState('médio');
  const [aceitacao, setAceitacao] = useState('média');
  const [publicoDia, setPublicoDia] = useState('Adultos');
  const [publicoAtingido, setPublicoAtingido] = useState('Adultos');
  const [horarioPico, setHorarioPico] = useState('');
  const [picoTouched, setPicoTouched] = useState(false);

  const [reportText, setReportText] = useState('');
  const [showOutput, setShowOutput] = useState(false);
  const [copyLabel, setCopyLabel] = useState('Copiar texto');
  const [saving, setSaving] = useState(false);

  function resetTaste(products: Product[]) {
    const t: Record<string, TasteEntry> = {};
    products.forEach((p) => {
      t[p.id] = { checked: true, qty: p.defaultQty, flavor: p.flavors[0]?.name || '' };
    });
    setTaste(t);
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/products?category=DEGUSTACAO').then((r) => r.json()),
      fetch('/api/products?category=VENDA').then((r) => r.json()),
      fetch('/api/agenda').then((r) => (r.ok ? r.json() : [])),
    ]).then(([deg, venda, agenda]) => {
      setDegustacaoProducts(deg);
      setVendaProducts(venda);
      resetTaste(deg);
      const map: Record<string, AgendaRow[]> = {};
      (agenda || []).forEach((it: AgendaRow) => {
        const key = it.data.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(it);
      });
      setAgendaByDay(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const daySlots = agendaByDay[data] || [];

  function selectSlot(s: AgendaRow) {
    setSelectedSlotId(s.id);
    setLocal(s.local);
    setHoraIni(s.horaIni);
    setHoraFim(s.horaFim);
    setPicoTouched(false);
  }

  // Ao trocar o dia: se houver exatamente uma degustação agendada, já preenche.
  // Se houver mais de uma, limpa e espera o promotor escolher. Se não houver, bloqueia.
  useEffect(() => {
    const slots = agendaByDay[data] || [];
    if (slots.length === 1) {
      const s = slots[0];
      setSelectedSlotId(s.id);
      setLocal(s.local);
      setHoraIni(s.horaIni);
      setHoraFim(s.horaFim);
      setPicoTouched(false);
    } else {
      setSelectedSlotId(null);
      setLocal('');
      setHoraIni('');
      setHoraFim('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, agendaByDay]);

  useEffect(() => {
    if (!picoTouched) {
      const s = suggestPeak(horaIni, horaFim);
      if (s) setHorarioPico(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [horaIni, horaFim]);

  function updateTaste(id: string, patch: Partial<TasteEntry>) {
    setTaste((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }
  function updateSaleQty(productId: string, flavorKey: string, delta: number) {
    setSaleQty((prev) => {
      const forProduct = { ...(prev[productId] || {}) };
      const next = Math.max(0, Math.min(50, (forProduct[flavorKey] || 0) + delta));
      forProduct[flavorKey] = next;
      return { ...prev, [productId]: forProduct };
    });
  }

  const allVendaProducts = useMemo(
    () => [...degustacaoProducts, ...vendaProducts],
    [degustacaoProducts, vendaProducts]
  );

  const canGenerate = !!selectedSlotId;

  function buildReportData() {
    const degustacaoLines: string[] = [];
    const materialLines: string[] = [];
    degustacaoProducts.forEach((p) => {
      const t = taste[p.id];
      if (!t || !t.checked) return;
      const flavorLower = (t.flavor || '').toLowerCase();
      degustacaoLines.push(`${p.name} ${flavorLower}`.trim());
      materialLines.push(`${t.qty} ${p.matName || p.name} ${flavorLower}`.trim());
    });
    customItems.forEach((item) => {
      if (!item.name.trim()) return;
      degustacaoLines.push(item.name.trim());
      materialLines.push(`${item.qty ? item.qty + ' ' : ''}${item.name.trim()}`);
    });

    const vendasLines: string[] = [];
    allVendaProducts.forEach((p) => {
      const forProduct = saleQty[p.id] || {};
      Object.entries(forProduct).forEach(([flavor, qty]) => {
        if (qty > 0) {
          vendasLines.push(flavor ? `${qty} ${p.name} ${flavor}` : `${qty} ${p.name}`);
        }
      });
    });
    customSales.forEach((cs) => {
      const q = Number(cs.qty);
      if (cs.name.trim() && q > 0) vendasLines.push(`${q} ${cs.name.trim()}`);
    });

    const localLine = `${local} ${horaIni || ''}${horaIni && horaFim ? ' às ' : ''}${horaFim || ''} ${formatDateBR(data)}`
      .replace(/\s+/g, ' ')
      .trim();

    const text =
`*Promotor:* ${session.name} 

*Local/Data:* ${localLine}

*Degustação:*
${degustacaoLines.join('\n')}


 *Movimento*: ${movimento}

*Público do dia*
${publicoDia}

*Público atingido*: 
${publicoAtingido}

*Aceitação*: ${aceitacao}

*Material utilizado:*
${materialLines.join('\n')}
*Horário de pico:*${horarioPico}

*Vendas*
${vendasLines.join('\n')}`;

    return {
      text, degustacaoLines, materialLines, vendasLines,
    };
  }

  function handleGenerate() {
    if (!canGenerate) return;
    const { text } = buildReportData();
    setReportText(text);
    setShowOutput(true);
  }

  async function persistAndReset() {
    setSaving(true);
    const { text, degustacaoLines, materialLines, vendasLines } = buildReportData();
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local, data, horaIni, horaFim, movimento, publicoDia, publicoAtingido,
          aceitacao, horarioPico,
          degustacao: degustacaoLines, material: materialLines, vendas: vendasLines,
          textoFinal: text,
        }),
      });
    } catch {
      // se falhar o salvamento, o texto já foi copiado/enviado — não bloqueia o fluxo
    }
    setSaving(false);
    resetTaste(degustacaoProducts);
    setCustomItems([]);
    setSaleQty({});
    setCustomSales((prev) => prev.map((cs) => ({ ...cs, qty: '' })));
    setPicoTouched(false);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(reportText);
    } catch {
      /* ignore */
    }
    setCopyLabel('Copiado!');
    setTimeout(() => setCopyLabel('Copiar texto'), 1800);
    await persistAndReset();
  }

  async function handleShare() {
    // @ts-ignore
    if (navigator.share) {
      try {
        // @ts-ignore
        await navigator.share({ text: reportText });
        await persistAndReset();
        return;
      } catch {
        /* usuário cancelou — cai no fallback abaixo */
      }
    }
    try {
      await navigator.clipboard.writeText(reportText);
      alert('Texto copiado! Cole no grupo do WhatsApp.');
    } catch {
      alert('Copie o texto manualmente e cole no WhatsApp.');
    }
    await persistAndReset();
  }

  return (
    <div>
      <div className="section">
        <h2>Promotor &amp; Local</h2>

        <div className="field">
          <span className="lbl">Promotor</span>
          <div style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card-2)', fontWeight: 500 }}>
            {session.name}
          </div>
        </div>

        <label className="field">
          <span className="lbl">Data da degustação</span>
          <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
        </label>

        {daySlots.length === 0 && (
          <div className="hint" style={{ marginTop: 4 }}>
            Nenhuma degustação agendada nesse dia. Se estiver correto, peça ao gestor para incluir na sua agenda.
          </div>
        )}

        {daySlots.length > 1 && (
          <div style={{ marginBottom: 6 }}>
            <span className="lbl">Escolha a degustação do dia</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 6 }}>
              {daySlots.map((s) => (
                <div
                  key={s.id}
                  onClick={() => selectSlot(s)}
                  style={{
                    cursor: 'pointer', padding: '10px 12px', borderRadius: 8,
                    border: '1px solid var(--line)',
                    background: selectedSlotId === s.id ? 'var(--red)' : 'var(--card-2)',
                    color: selectedSlotId === s.id ? '#fff' : 'var(--text)',
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{s.local}</div>
                  <div style={{ fontSize: 12.5, opacity: 0.85 }}>{s.horaIni} às {s.horaFim}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="field">
          <span className="lbl">Local (definido pela agenda)</span>
          <input type="text" value={local} disabled placeholder="Selecione um dia agendado" />
        </label>

        <div className="row2">
          <label className="field" style={{ marginBottom: 0 }}>
            <span className="lbl">Início</span>
            <input type="time" value={horaIni} disabled />
          </label>
          <label className="field" style={{ marginBottom: 0 }}>
            <span className="lbl">Fim</span>
            <input type="time" value={horaFim} disabled />
          </label>
        </div>
      </div>

      <div className="section">
        <h2>Degustação &amp; Material</h2>
        {degustacaoProducts.map((p) => {
          const t = taste[p.id];
          if (!t) return null;
          return (
            <div key={p.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 8, background: 'var(--card-2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={t.checked} onChange={(e) => updateTaste(p.id, { checked: e.target.checked })} style={{ width: 20, height: 20 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{p.name}</div>
                  {p.suggestion && <div className="hint" style={{ margin: 0 }}>sugestão: {p.suggestion}</div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="btn secondary small" onClick={() => updateTaste(p.id, { qty: Math.max(0, t.qty - 1) })}>–</button>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, width: 20, textAlign: 'center' }}>{t.qty}</span>
                  <button className="btn secondary small" onClick={() => updateTaste(p.id, { qty: Math.min(20, t.qty + 1) })}>+</button>
                </div>
              </div>
              {p.flavors.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                  {p.flavors.map((f) => (
                    <label
                      key={f.id}
                      style={{
                        flex: '1 1 auto', minWidth: 78, textAlign: 'center', fontSize: 12.5, padding: '8px 6px',
                        borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer',
                        background: t.flavor === f.name ? 'var(--red)' : 'transparent',
                        color: t.flavor === f.name ? '#fff' : 'var(--text-dim)',
                      }}
                    >
                      <input type="radio" style={{ display: 'none' }} checked={t.flavor === f.name} onChange={() => updateTaste(p.id, { flavor: f.name })} />
                      {f.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {customItems.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input type="text" placeholder="nome do item" value={item.name}
              onChange={(e) => setCustomItems((prev) => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} style={{ flex: 2 }} />
            <input type="text" placeholder="qtd" value={item.qty}
              onChange={(e) => setCustomItems((prev) => prev.map((it, i) => i === idx ? { ...it, qty: e.target.value } : it))} style={{ flex: 1, textAlign: 'center' }} />
            <button className="btn secondary small" onClick={() => setCustomItems((prev) => prev.filter((_, i) => i !== idx))}>×</button>
          </div>
        ))}
        <button className="btn secondary full" onClick={() => setCustomItems((prev) => [...prev, { name: '', qty: '' }])}>
          + adicionar outro item
        </button>
      </div>

      <div className="section">
        <h2>Movimento &amp; Público</h2>
        <div className="row2">
          <label className="field">
            <span className="lbl">Movimento</span>
            <select value={movimento} onChange={(e) => setMovimento(e.target.value)}>
              <option value="baixo">Baixo</option>
              <option value="médio">Médio</option>
              <option value="alto">Alto</option>
            </select>
          </label>
          <label className="field">
            <span className="lbl">Aceitação</span>
            <select value={aceitacao} onChange={(e) => setAceitacao(e.target.value)}>
              <option value="baixa">Baixa</option>
              <option value="média">Média</option>
              <option value="boa">Boa</option>
              <option value="alta">Alta</option>
              <option value="ótima">Ótima</option>
            </select>
          </label>
        </div>
        <div className="row2">
          <label className="field">
            <span className="lbl">Público do dia</span>
            <input type="text" value={publicoDia} onChange={(e) => setPublicoDia(e.target.value)} />
          </label>
          <label className="field">
            <span className="lbl">Público atingido</span>
            <input type="text" value={publicoAtingido} onChange={(e) => setPublicoAtingido(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="lbl">Horário de pico</span>
          <input type="text" value={horarioPico} onChange={(e) => { setPicoTouched(true); setHorarioPico(e.target.value); }} placeholder="ex: 12:00 às 13:00" />
        </label>
      </div>

      <div className="section">
        <h2>Vendas</h2>
        <div className="hint" style={{ marginBottom: 10 }}>marque o que vendeu — inclui os produtos de degustação e os que só têm venda</div>
        {allVendaProducts.map((p) => {
          const forProduct = saleQty[p.id] || {};
          if (p.flavors.length === 0) {
            const qty = forProduct[''] || 0;
            return (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid var(--line)', borderRadius: 10, padding: '9px 12px', marginBottom: 7, background: 'var(--card-2)' }}>
                <span style={{ fontSize: 13.5 }}>{p.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button className="btn secondary small" onClick={() => updateSaleQty(p.id, '', -1)}>–</button>
                  <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, width: 20, textAlign: 'center' }}>{qty}</span>
                  <button className="btn secondary small" onClick={() => updateSaleQty(p.id, '', 1)}>+</button>
                </div>
              </div>
            );
          }
          return (
            <div key={p.id} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: 12, marginBottom: 8, background: 'var(--card-2)' }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>{p.name}</div>
              {p.flavors.map((f) => {
                const qty = forProduct[f.name] || 0;
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize: 13 }}>{f.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button className="btn secondary small" onClick={() => updateSaleQty(p.id, f.name, -1)}>–</button>
                      <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, width: 20, textAlign: 'center' }}>{qty}</span>
                      <button className="btn secondary small" onClick={() => updateSaleQty(p.id, f.name, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        {customSales.map((cs, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
            <input type="text" placeholder="novo produto vendido" value={cs.name}
              onChange={(e) => setCustomSales((prev) => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))} style={{ flex: 2 }} />
            <input type="text" placeholder="qtd" value={cs.qty}
              onChange={(e) => setCustomSales((prev) => prev.map((it, i) => i === idx ? { ...it, qty: e.target.value } : it))} style={{ flex: 1, textAlign: 'center' }} />
            <button className="btn secondary small" onClick={() => setCustomSales((prev) => prev.filter((_, i) => i !== idx))}>×</button>
          </div>
        ))}
        <button className="btn secondary full" onClick={() => setCustomSales((prev) => [...prev, { name: '', qty: '' }])}>
          + adicionar produto vendido
        </button>
      </div>

      <button className="btn full" style={{ marginBottom: 6 }} onClick={handleGenerate} disabled={!canGenerate}>
        Gerar relatório
      </button>
      {!canGenerate && (
        <div className="hint" style={{ marginBottom: 18 }}>
          Selecione um dia com degustação agendada para gerar o relatório.
        </div>
      )}

      {showOutput && (
        <div>
          <div className="receipt">{reportText}</div>
          <button className="btn full" style={{ marginTop: 14, background: 'var(--green)', color: '#0b0b0d' }} onClick={handleShare} disabled={saving}>
            Enviar pro WhatsApp
          </button>
          <button className="btn secondary full" style={{ marginTop: 10 }} onClick={handleCopy} disabled={saving}>
            {copyLabel}
          </button>
        </div>
      )}
    </div>
  );
}
