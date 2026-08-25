import { useState } from 'react';
import { useRouter } from 'next/router';
import BrandFooter from '@/components/BrandFooter';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Não foi possível entrar');
        setLoading(false);
        return;
      }
      router.push(data.role === 'GESTOR' ? '/gestor' : '/promotor');
    } catch {
      setError('Erro de conexão. Tente novamente.');
      setLoading(false);
    }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <img src="/topway-icon.png" alt="Topway Nutrition" className="badge" />
          <img src="/topway-wordmark-white.png" alt="Topway Nutrition" className="wordmark" />
        </div>
        <h1>Bem-vindo de volta</h1>
        <p className="sub">Entre para ver sua agenda de degustações de hoje.</p>
        <form onSubmit={handleSubmit}>
          <label className="field">
            <span className="lbl">Usuário</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </label>
          <label className="field">
            <span className="lbl">Senha</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          {error && <div className="error-msg">{error}</div>}
          <button className="btn full" type="submit" disabled={loading} style={{ marginTop: 16 }}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
      <BrandFooter />
    </div>
  );
}
