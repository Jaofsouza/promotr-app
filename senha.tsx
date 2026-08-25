import { useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '@/lib/useSession';
import TopHeader from '@/components/TopHeader';
import BrandFooter from '@/components/BrandFooter';

export default function TrocarSenha() {
  const { session, loading } = useRequireAuth('GESTOR');
  const router = useRouter();

  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (novaSenha.length < 4) {
      setError('A nova senha precisa ter pelo menos 4 caracteres');
      return;
    }
    if (novaSenha !== confirmar) {
      setError('A confirmação não bate com a nova senha');
      return;
    }

    setSaving(true);
    const res = await fetch('/api/auth/senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);

    if (!res.ok) {
      setError(data.error || 'Não foi possível trocar a senha');
      return;
    }

    setSenhaAtual('');
    setNovaSenha('');
    setConfirmar('');
    setSuccess(true);
  }

  if (loading || !session) return <div className="wrap">Carregando...</div>;

  return (
    <div className="wrap">
      <TopHeader session={session} title="Trocar senha" />
      <button className="btn secondary small" onClick={() => router.push('/gestor')} style={{ marginBottom: 14 }}>
        &larr; voltar
      </button>

      <div className="section">
        <h2>Trocar senha</h2>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="lbl">Senha atual</span>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="lbl">Nova senha</span>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
            />
          </label>
          <label className="field">
            <span className="lbl">Confirmar nova senha</span>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
            />
          </label>
          {error && <div className="error-msg">{error}</div>}
          {success && (
            <div className="hint" style={{ color: 'var(--green)', marginTop: 8 }}>
              ✓ Senha alterada com sucesso.
            </div>
          )}
          <button className="btn full" type="submit" disabled={saving} style={{ marginTop: 10 }}>
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </div>
      <BrandFooter />
    </div>
  );
}
