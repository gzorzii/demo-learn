import { useNavigate } from 'react-router';
import { ShieldX } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuthContext } from '../context/AuthContext';

export function AccessDeniedPage() {
  const { defaultRoute } = useAuthContext();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
      <ShieldX size={64} className="text-[#2D2A96] opacity-60" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-gray-800">Acesso negado</h1>
        <p className="text-gray-500 text-base max-w-sm">
          Você não tem permissão para acessar esta página.
        </p>
      </div>
      <Button
        onClick={() => navigate(defaultRoute, { replace: true })}
        className="bg-[#2D2A96] hover:bg-[#24217D] font-bold"
      >
        Voltar ao início
      </Button>
    </div>
  );
}
