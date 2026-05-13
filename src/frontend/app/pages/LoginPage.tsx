import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { authService } from '../services/authService';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

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
    <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center p-4 font-['DM_Sans']">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#2D2A96] rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-black text-xl">CI&T</span>
          </div>
          <h1 className="text-3xl font-black text-[#2D2A96] tracking-tight">CI&T Perform</h1>
          <p className="text-gray-500 mt-1">Performance Management System</p>
        </div>

        <Card className="shadow-xl border-0 rounded-3xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-black text-gray-800">Entrar</CardTitle>
            <CardDescription>Acesse com seu e-mail corporativo</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoFocus
                  className="h-12 rounded-xl"
                />
              </div>
              {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
              <Button
                type="submit"
                disabled={loading || !email}
                className="h-12 rounded-xl bg-[#2D2A96] hover:bg-[#24217D] font-bold text-base"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-400 font-medium">ou</span>
              </div>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => setError('Falha ao autenticar com Google.')}
                useOneTap={false}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}