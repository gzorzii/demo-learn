import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { authService } from '../services/authService';
import './LoginPage.css';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleGoogleSuccess(credentialResponse: CredentialResponse) {
    if (!credentialResponse.credential) return;
    setError('');
    setLoading(true);
    try {
      await authService.googleLogin(credentialResponse.credential);
      navigate('/', { replace: true });
    } catch {
      setError('Conta Google não autorizada.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authService.login(email);
      navigate('/', { replace: true });
    } catch {
      setError('E-mail não encontrado ou sem perfil cadastrado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>Livraria</h1>
        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            autoFocus
          />
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={loading || !email}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <div className="login-divider">ou</div>
        <div className="login-google">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Falha ao autenticar com Google.')}
            useOneTap={false}
          />
        </div>
      </div>
    </div>
  );
}
