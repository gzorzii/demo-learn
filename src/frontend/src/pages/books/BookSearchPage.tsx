import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import type { BookPage } from '../../types/book';
import './BookSearchPage.css';

const fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function BookSearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BookPage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      setLoading(true);
      setError('');
      bookService.search({ q: query })
        .then(setResults)
        .catch(() => setError('Erro na busca.'))
        .finally(() => setLoading(false));
    }, 300);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [query]);

  return (
    <div className="book-search-page">
      <h1>Buscar Livros</h1>

      <div className="search-bar">
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Buscar por título, autor ou ISBN..."
        />
        <button className="btn btn-secondary" onClick={() => navigate('/books')}>
          ← Voltar
        </button>
      </div>

      {loading && <p className="status-msg">Buscando...</p>}
      {error && <p className="status-msg error-msg">{error}</p>}

      {!loading && results && (
        <div className="search-results">
          {results.content.length === 0 ? (
            <p className="status-msg">Nenhum resultado para "{query}".</p>
          ) : (
            results.content.map(b => (
              <div key={b.id} className="search-result-item" onClick={() => navigate(`/books/${b.id}`)}>
                <div className="result-main">
                  <div className="result-title">
                    {b.title}
                    <span className={b.condition === 'new' ? 'badge badge-new' : 'badge badge-used'}>
                      {b.condition === 'new' ? 'Novo' : 'Usado'}
                    </span>
                  </div>
                  <div className="result-author">{b.author} · {b.category}</div>
                </div>
                <div className="result-meta">
                  <div className="result-price">{fmt.format(b.salePrice)}</div>
                  <div className="result-stock">Estoque: {b.stockQuantity}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
