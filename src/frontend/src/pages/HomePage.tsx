import { useAuth } from '../hooks/useAuth';
import './HomePage.css';

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="home">
      <h1 className="home-title">Olá, {user?.name?.split(' ')[0]}</h1>
      <p className="home-subtitle">Bem-vindo ao sistema</p>
    </div>
  );
}
