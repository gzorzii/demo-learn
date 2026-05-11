import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { bookService } from '../../services/bookService';
import type { BookPage, BookSummary } from '../../types/book';
import './BookListPage.css';

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function BookListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState<BookPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [condition, setCondition] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('registered_at');
  const [direction, setDirection] = useState('desc');
  const [page, setPage] = useState(0);

  const canWrite = user?.roles.some(r => ['Administrador', 'Gerente', 'Catalogador'].includes(r));

  useEffect(() => {
    setLoading(true);
    setError('');
    bookService.list({ condition: condition || undefined, category: category || undefined, sort, direction, page })
      .then(setData)
      .catch(() => setError('Erro ao carregar livros.'))
      .finally(() => setLoading(false));
  }, [condition, category, sort, direction, page]);

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleRowClick(e: React.MouseEvent, book: BookSummary) {
    if ((e.target as HTMLElement).tagName === 'INPUT') return;
    navigate(`/books/${book.id}`);
  }

  return (
    <div className="book-list-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1>Catálogo de Livros</h1>
        {canWrite && (
          <button className="btn btn-primary" onClick={() => navigate('/books/new')}>
            + Cadastrar Livro
          </button>
        )}
      </div>

      <div className="book-list-toolbar">
        <div className="filter-group">
          <label>Condição</label>
          <select value={condition} onChange={e => { setCondition(e.target.value); setPage(0); }}>
            <option value="">Todas</option>
            <option value="new">Novo</option>
            <option value="used">Usado</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Categoria</label>
          <input value={category} onChange={e => { setCategory(e.target.value); setPage(0); }} placeholder="Filtrar categoria" />
        </div>
        <div className="filter-group">
          <label>Ordenar por</label>
          <select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}>
            <option value="registered_at">Data de cadastro</option>
            <option value="title">Título</option>
            <option value="sale_price">Preço</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Direção</label>
          <select value={direction} onChange={e => { setDirection(e.target.value); setPage(0); }}>
            <option value="desc">Decrescente</option>
            <option value="asc">Crescente</option>
          </select>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/books/search')}>
          Buscar
        </button>
      </div>

      {selected.size > 0 && (
        <div className="selection-bar">
          {selected.size} livro(s) selecionado(s) para impressão de etiquetas
        </div>
      )}

      {loading && <p className="status-msg">Carregando...</p>}
      {error && <p className="status-msg error-msg">{error}</p>}

      {!loading && !error && data && (
        <>
          {data.content.length === 0 ? (
            <p className="status-msg">Nenhum livro encontrado.</p>
          ) : (
            <table className="book-table">
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Título</th>
                  <th>Autor</th>
                  <th>Categoria</th>
                  <th>Condição</th>
                  <th>Preço</th>
                  <th>Estoque</th>
                  <th>Prateleira</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map(b => (
                  <tr key={b.id} onClick={e => handleRowClick(e, b)}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(b.id)}
                        onChange={() => toggleSelect(b.id)}
                      />
                    </td>
                    <td>{b.title}</td>
                    <td>{b.author}</td>
                    <td>{b.category}</td>
                    <td>
                      <span className={b.condition === 'new' ? 'badge badge-new' : 'badge badge-used'}>
                        {b.condition === 'new' ? 'Novo' : 'Usado'}
                      </span>
                    </td>
                    <td>{fmt.format(b.salePrice)}</td>
                    <td>{b.stockQuantity}</td>
                    <td>{b.shelfLocation ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="pagination">
            <button className="btn btn-secondary" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              ← Anterior
            </button>
            <span>Página {data.page + 1} de {data.totalPages || 1} ({data.totalElements} registros)</span>
            <button
              className="btn btn-secondary"
              disabled={page >= data.totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              Próxima →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
