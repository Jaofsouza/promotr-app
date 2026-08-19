import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/lib/useSession';
import TopHeader from '@/components/TopHeader';

type Promotor = { id: string; name: string; username: string };
type ParsedSlot = { local: string; horaIni: string; horaFim: string };
type ParsedLine = { offset: number | null; slots: ParsedSlot[]; raw: string; error?: string };
type AgendaRow = { id: string; data: string; local: string; horaIni: string; horaFim: string };
type Item = { data: string; local: string; horaIni: string; horaFim: string };

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// tokens de dia da semana (sem acento) -> deslocamento a partir da segunda (0)
const DOW: Record<string, number> = {
  seg: 0, segunda: 0,
  ter: 1, terca: 1,
  qua: 2, quarta: 2,
  qui: 3, quinta: 3,
  sex: 4, sexta: 4,
  sab: 5, sabado: 5,
  dom: 6, domingo: 6,
};

function norm(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
}
function pad2(s: string) { return s.length === 1 ? '0' + s : s; }
function formatDateBR(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
// próxima segunda-feira a partir de hoje
function nextMondayISO() {
  const t = new Date();
  const dow = t.getDay(); // 0=dom..6=sab
  const add = ((8 - dow) % 7) || 7;
  t.setDate(t.getDate() + add);
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, '0');
  const d = String(t.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function addDaysISO(iso: string, n: number) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}
function cleanLocal(str: string) {
  let s = str.trim();
  s = s.replace(/[\s\-–:]+$/g, '').trim();
  s = s.replace(/\s+(de|das|da|do|a|as|às|ate|até)$/i, '').trim();
  return s;
}
function parseSlot(chunk: string): ParsedSlot | null {
  const times = [...chunk.matchAll(/(\d{1,2}):(\d{2})/g)];
  if (times.length < 2) return null;
  const first = times[0];
  const horaIni = `${pad2(first[1])}:${first[2]}`;
  const horaFim = `${pad2(times[1][1])}:${times[1][2]}`;
  const local = cleanLocal(chunk.slice(0, first.index || 0));
  if (!local) return null;
  return { local, horaIni, horaFim };
}
function parseLine(raw: string): ParsedLine | null {
  const line = raw.trim();
  if (!line) return null;
  // linha sem horário (cabeçalho, título etc.) é ignorada
  if (!/(\d{1,2}):(\d{2})/.test(line)) return null;
  const m = line.match(/^([^\s\-–:]+)\s*[-–:]?\s*(.*)$/);
  if (!m) return { offset: null, slots: [], raw, error: 'não entendi a linha' };
  const offset = norm(m[1]) in DOW ? DOW[norm(m[1])] : null;
  if (offset === null) return { offset: null, slots: [], raw, error: 'não reconheci o dia da semana' };
  const slots: ParsedSlot[] = [];
  m[2].split('/').forEach((c) => {
    const s = parseSlot(c);
    if (s) slots.push(s);
  });
  if (slots.length === 0) return { offset, slots: [], raw, error: 'não encontrei local/horário válidos' };
  return { offset, slots, raw };
}

export default function GestorAgenda() {
  const { session, loading } = useRequireAuth('GESTOR');
  const router = useRouter();
  const [promotores, setPromotores] = useState<Promotor[]>([]);
  const [promotorId, setPromotorId] = useState('');
  const [monday, setMonday] = useState(nextMondayISO());
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState<ParsedLine[] | null>(null);
  const [existing, setExisting] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/promotores')
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setPromotores(Array.isArray(d) ? d : []));
  }, []);

  const sunday = useMemo(() => addDaysISO(monday, 6), [monday]);
  const promotorNome = promotores.find((p) => p.id === promotorId)?.name || '';

  const validItems: Item[] = useMemo(() => {
    if (!parsed) return [];
    const out: Item[] = [];
    parsed.forEach((pl) => {
      if (pl.offset === null) return;
      const dia = addDaysISO(monday, pl.offset);
      pl.slots.forEach((s) => out.push({ data: dia, local: s.local, horaIni: s.horaIni, horaFim: s.horaFim }));
    });
    return out.sort((a, b) => (a.data + a.horaIni).localeCompare(b.data + b.horaIni));
  }, [parsed, monday]);

  const badLines = useMemo(() => (parsed || []).filter((p) => p.error), [parsed]);

  async function analisar() {
    setError('');
    setSavedCount(null);
    if (!promotorId) { setError('Escolha o promotor.'); return; }
    if (!monday) { setError('Defina a segunda-feira da semana.'); return; }
    const lines = text.split('\n').map(parseLine).filter(Boolean) as ParsedLine[];
    if (lines.length === 0) { setError('Cole a agenda no campo de texto.'); return; }
    setParsed(lines);
    try {
      const res = await fetch(`/api/agenda?promotorId=${promotorId}`);
      const items: AgendaRow[] = res.ok ? await res.json() : [];
      const inWeek = items.filter((it) => {
        const d = String(it.data).slice(0, 10);
        return d >= monday && d <= sunday;
      });
      setExisting(inWeek.length);
    } catch {
      setExisting(0);
    }
  }

  function cancelar() {
    setParsed(null);
    setExisting(0);
    setError('');
  }

  async function confirmar() {
    setSaving(true);
    setError('');
    let ok = 0;
    for (const it of validItems) {
      try {
        const res = await fetch('/api/agenda', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ promotorId, data: it.data, local: it.local, horaIni: it.horaIni, horaFim: it.horaFim }),
        });
        if (res.ok) ok++;
      } catch {
        /* segue */
      }
    }
    setSaving(false);
    setSavedCount(ok);
    setParsed(null);
    setExisting(0);
    setText('');
  }

  if (loading || !session) return <div className="wrap">Carregando...</div>;

  // agrupa a prévia por dia
  const byDay: Record<string, Item[]> = {};
  validItems.forEach((it) => {
    if (!byDay[it.data]) byDay[it.data] = [];
    byDay[it.data].push(it);
  });
  const days = Object.keys(byDay).sort();

  return (
    <div className="wrap">
      <TopHeader session={session} title="Painel do Gestor" />
      <div className="tabs">
        <div className="tab" onClick={() => router.push('/gestor')}>Promotores</div>
        <div className="tab" onClick={() => router.push('/gestor/produtos')}>Catálogo de produtos</div>
        <div className="tab active">Agenda</div>
      </div>

      <div className="section">
        <h2>Subir agenda da semana</h2>
        <div className="hint" style={{ marginTop: 0 }}>
          Escolha o promotor, confira a segunda-feira da semana e cole a agenda. O sistema mostra o que entendeu antes de salvar.
        </div>

        <label className="field">
          <span className="lbl">Promotor</span>
          <select value={promotorId} onChange={(e) => setPromotorId(e.target.value)}>
            <option value="">Selecione...</option>
            {promotores.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label className="field">
          <span className="lbl">Semana (segunda-feira)</span>
          <input type="date" value={monday} onChange={(e) => setMonday(e.target.value)} />
          <span className="hint" style={{ marginTop: 4 }}>
            Semana de {formatDateBR(monday)} a {formatDateBR(sunday)}
          </span>
        </label>

        <label className="field">
          <span className="lbl">Agenda (cole aqui)</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Seg - Ultrabox Paranoá Park de 09:00 as 13:00\nTer - Comercial Reis Lago Norte de 09:00 as 13:00\nQua - Bigbox 410 sul de 08:30 a 12:30 / Bigbox 413 sul de 13:30 as 17:30\nQui - Bigbox Lago Norte de 09:00 as 13:00\nSex - Biomundo 110 norte Plaza de 10:00 as 14:00'}
            style={{
              width: '100%', minHeight: 150, resize: 'vertical', padding: '10px 12px',
              border: '1px solid var(--line)', borderRadius: 8, background: 'var(--card-2)',
              color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.5,
            }}
          />
        </label>

        {error && <div className="error-msg">{error}</div>}
        {savedCount !== null && (
          <div className="hint" style={{ color: 'var(--green)' }}>
            ✓ {savedCount} {savedCount === 1 ? 'item criado' : 'itens criados'} na agenda{promotorNome ? ` de ${promotorNome}` : ''}.
          </div>
        )}

        {!parsed && (
          <button className="btn full" style={{ marginTop: 6 }} onClick={analisar}>Analisar</button>
        )}
      </div>

      {parsed && (
        <div className="section">
          <h2>Prévia</h2>
          <div className="hint" style={{ marginTop: 0 }}>
            {promotorNome} • semana de {formatDateBR(monday)} a {formatDateBR(sunday)}
          </div>

          {existing > 0 && (
            <div className="error-msg" style={{ marginTop: 10 }}>
              ⚠ Esse promotor já tem {existing} {existing === 1 ? 'item' : 'itens'} nessa semana. Confirmar vai ADICIONAR os novos (pode duplicar). Se quiser trocar, remova/edite os antigos antes.
            </div>
          )}

          {days.length === 0 ? (
            <div className="hint">Nenhuma linha válida encontrada.</div>
          ) : (
            <div className="week-grid" style={{ marginTop: 10 }}>
              {days.map((day) => {
                const d = new Date(day + 'T00:00:00');
                const label = `${WEEKDAYS[d.getDay()].slice(0, 3)} ${formatDateBR(day)}`;
                return (
                  <div className="day-card" key={day}>
                    <div className="day-label">{label}</div>
                    {byDay[day].map((it, i) => (
                      <div className="slot" key={i}>
                        <div className="slot-time">{it.horaIni} às {it.horaFim}</div>
                        <div>{it.local}</div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {badLines.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div className="lbl" style={{ color: 'var(--red)' }}>Linhas que não entendi (não serão salvas):</div>
              {badLines.map((b, i) => (
                <div key={i} className="hint" style={{ marginTop: 4 }}>• {b.raw} — {b.error}</div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn" onClick={confirmar} disabled={saving || validItems.length === 0}>
              {saving ? 'Salvando...' : `Confirmar e salvar (${validItems.length})`}
            </button>
            <button className="btn secondary" onClick={cancelar} disabled={saving}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
