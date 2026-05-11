import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { bookService } from '../../services/bookService';
import type { Book } from '../../types/book';
import './BookDetailPage.css';

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

function resolveUrl(url: string) {
  return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canWrite = user?.roles.some(r => ['Administrador', 'Gerente', 'Catalogador'].includes(r));

  useEffect(() => {
    if (!id) return;
    bookService.getById(id)
      .then(setBook)
      .catch(e => {
        const msg = e instanceof Error ? e.message : '';
        if (msg === '404') {
          setError('Livro não encontrado.');
          setTimeout(() => navigate('/books'), 2000);
        } else if (msg === '403') {
          setError('Acesso negado. Este livro pertence a outra filial.');
        } else {
          setError('Erro ao carregar livro.');
        }
      })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <p className="status-msg">Carregando...</p>;
  if (error) return <p className="status-msg error-msg">{error}</p>;
  if (!book) return null;

  return (
    <div className="book-detail-page">
      <h1>{book.title}</h1>
      <p className="subtitle">{book.author}</p>

      <div className="book-detail-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/books')}>← Voltar</button>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => navigate(`/books/${book.id}/edit`)}>
            Editar
          </button>
        )}
        <button className="btn btn-secondary" onClick={() => navigate(`/books/${book.id}/images`)}>
          Gerenciar Imagens
        </button>
      </div>

      <div className="book-detail-grid">
        <div className="detail-field">
          <label>ISBN</label>
          <span>{book.isbn ?? '—'}</span>
        </div>
        <div className="detail-field">
          <label>Editora</label>
          <span>{book.publisher ?? '—'}</span>
        </div>
        <div className="detail-field">
          <label>Ano</label>
          <span>{book.year ?? '—'}</span>
        </div>
        <div className="detail-field">
          <label>Categoria</label>
          <span>{book.category}</span>
        </div>
        <div className="detail-field">
          <label>Condição</label>
          <span>
            <span className={book.condition === 'new' ? 'badge badge-new' : 'badge badge-used'}>
              {book.condition === 'new' ? 'Novo' : 'Usado'}
            </span>
          </span>
        </div>
        {book.conditionDescription && (
          <div className="detail-field">
            <label>Descrição da Condição</label>
            <span>{book.conditionDescription}</span>
          </div>
        )}
        <div className="detail-field">
          <label>Preço de Venda</label>
          <span>{fmt.format(book.salePrice)}</span>
        </div>
        <div className="detail-field">
          <label>Estoque</label>
          <span>{book.stockQuantity}</span>
        </div>
        <div className="detail-field">
          <label>Prateleira</label>
          <span>{book.shelfLocation ?? '—'}</span>
        </div>
        <div className="detail-field">
          <label>Status</label>
          <span>
            <span className={book.active ? 'badge badge-active' : 'badge badge-inactive'}>
              {book.active ? 'Ativo' : 'Inativo'}
            </span>
          </span>
        </div>
        <div className="detail-field">
          <label>Cadastrado em</label>
          <span>{new Date(book.registeredAt).toLocaleDateString('pt-BR')}</span>
        </div>
        {book.description && (
          <div className="detail-field detail-full">
            <label>Descrição</label>
            <span>{book.description}</span>
          </div>
        )}
      </div>

      <div className="book-gallery">
        <h2>Imagens</h2>
        {book.images.length === 0 ? (
          <p className="no-images">Nenhuma imagem cadastrada.</p>
        ) : (
          <div className="gallery-images">
            {book.images.map(img => (
              <img key={img.id} src={resolveUrl(img.url)} alt={book.title} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
