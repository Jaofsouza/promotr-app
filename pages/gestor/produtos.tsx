import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/lib/useSession';
import TopHeader from '@/components/TopHeader';
import BrandFooter from '@/components/BrandFooter';

type Flavor = { id: string; name: string };
type Product = {
  id: string; name: string; matName?: string | null; category: string;
  suggestion?: string | null; defaultQty: number; color: string; flavors: Flavor[];
};

export default function ProdutosAdmin() {
  const { session, loading } = useRequireAuth('GESTOR');
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [showNew, setShowNew] = useState(false);

  const [name, setName] = useState('');
  const [matName, setMatName] = useState('');
  const [category, setCategory] = useState('DEGUSTACAO');
  const [suggestion, setSuggestion] = useState('');
  const [defaultQty, setDefaultQty] = useState(2);
  const [flavorsText, setFlavorsText] = useState('');
  const [creating, setCreating] = useState(false);

  function loadProducts() {
    fetch('/api/products').then((r) => r.json()).then((d) => setProducts(Array.isArray(d) ? d : []));
  }

  useEffect(() => {
    if (session) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const flavors = flavorsText.split(',').map((f) => f.trim()).filter(Boolean);
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, matName: matName || null, category, suggestion: suggestion || null, defaultQty, flavors }),
    });
    setCreating(false);
    setName(''); setMatName(''); setSuggestion(''); setFlavorsText(''); setDefaultQty(2);
    setShowNew(false);
    loadProducts();
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este produto do catálogo?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    loadProducts();
  }

  if (loading || !session) return <div className="wrap">Carregando...</div>;

  return (
    <div className="wrap-wide">
      <TopHeader session={session} title="Painel do Gestor" />
      <div className="tabs">
        <div className="tab" onClick={() => router.push('/gestor')}>Promotores</div>
        <div className="tab active">Catálogo de produtos</div>
      </div>

      <div className="section">
        <h2>Degustação &amp; Material</h2>
        <table className="data-table">
          <thead><tr><th>Produto</th><th>Sabores</th><th>Sugestão</th><th></th></tr></thead>
          <tbody>
            {products.filter((p) => p.category === 'DEGUSTACAO').map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.flavors.map((f) => f.name).join(', ') || '—'}</td>
                <td>{p.suggestion || '—'}</td>
                <td><button className="btn secondary small" onClick={() => handleDelete(p.id)}>remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        <h2>Só Vendas</h2>
        <table className="data-table">
          <thead><tr><th>Produto</th><th>Sabores</th><th></th></tr></thead>
          <tbody>
            {products.filter((p) => p.category === 'VENDA').map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.flavors.map((f) => f.name).join(', ') || '—'}</td>
                <td><button className="btn secondary small" onClick={() => handleDelete(p.id)}>remover</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section">
        {!showNew ? (
          <button className="btn full" onClick={() => setShowNew(true)}>+ Novo produto</button>
        ) : (
          <form onSubmit={handleCreate}>
            <h2>Novo produto</h2>
            <label className="field">
              <span className="lbl">Nome</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
            </label>
            <label className="field">
              <span className="lbl">Onde aparece</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="DEGUSTACAO">Degustação &amp; Material (e Vendas)</option>
                <option value="VENDA">Só Vendas</option>
              </select>
            </label>
            {category === 'DEGUSTACAO' && (
              <>
                <label className="field">
                  <span className="lbl">Nome no "Material utilizado" (ex: dose whey 100%)</span>
                  <input type="text" value={matName} onChange={(e) => setMatName(e.target.value)} />
                </label>
                <label className="field">
                  <span className="lbl">Sugestão de quantidade (ex: 3–4 doses)</span>
                  <input type="text" value={suggestion} onChange={(e) => setSuggestion(e.target.value)} />
                </label>
              </>
            )}
            <label className="field">
              <span className="lbl">Quantidade padrão</span>
              <input type="number" min={0} max={20} value={defaultQty} onChange={(e) => setDefaultQty(Number(e.target.value))} />
            </label>
            <label className="field">
              <span className="lbl">Sabores (separados por vírgula — deixe em branco se não tiver)</span>
              <input type="text" value={flavorsText} onChange={(e) => setFlavorsText(e.target.value)} placeholder="ex: Cookies, Banoff, Morango" />
            </label>
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
