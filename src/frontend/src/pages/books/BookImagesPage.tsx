import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import type { Book, BookImage } from '../../types/book';
import './BookImagesPage.css';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

function resolveUrl(url: string) {
  return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

export function BookImagesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [images, setImages] = useState<BookImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    bookService.getById(id)
      .then(b => { setBook(b); setImages(b.images); })
      .catch(() => setError('Erro ao carregar livro.'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    if (images.length >= 10) return;

    setUploading(true);
    setError('');
    try {
      const img = await bookService.uploadImage(id, file);
      setImages(prev => [...prev, img]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === '409') setError('Limite de 10 imagens atingido.');
      else if (msg === '400') setError('Formato inválido. Use JPEG, PNG ou WebP.');
      else setError('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function handleDelete(imageId: string) {
    if (!id || !confirm('Remover esta imagem?')) return;
    try {
      await bookService.deleteImage(id, imageId);
      setImages(prev => prev.filter(i => i.id !== imageId));
    } catch {
      setError('Erro ao remover imagem.');
    }
  }

  async function moveUp(index: number) {
    if (index === 0 || !id) return;
    const next = [...images];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    const order = next.map((img, i) => ({ imageId: img.id, order: i }));
    try {
      const updated = await bookService.reorderImages(id, order);
      setImages(updated);
    } catch {
      setError('Erro ao reordenar imagens.');
    }
  }

  async function moveDown(index: number) {
    if (index >= images.length - 1 || !id) return;
    const next = [...images];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    const order = next.map((img, i) => ({ imageId: img.id, order: i }));
    try {
      const updated = await bookService.reorderImages(id, order);
      setImages(updated);
    } catch {
      setError('Erro ao reordenar imagens.');
    }
  }

  if (loading) return <p className="status-msg">Carregando...</p>;
  if (!book) return <p className="status-msg error-msg">{error || 'Livro não encontrado.'}</p>;

  return (
    <div className="book-images-page">
      <h1>Imagens do Livro</h1>
      <p className="subtitle">{book.title}</p>

      <div className="images-toolbar">
        <button className="btn btn-secondary" onClick={() => navigate(`/books/${book.id}`)}>
          ← Voltar
        </button>
        <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
          {images.length}/10 imagens
        </span>
      </div>

      {error && <p className="api-error">{error}</p>}

      <div className="image-list">
        {images.map((img, index) => (
          <div key={img.id} className="image-item">
            <img src={resolveUrl(img.url)} alt={`Imagem ${index + 1}`} />
            <div className="image-item-info">Ordem: {img.order}</div>
            <div className="image-item-actions">
              <button className="btn btn-secondary" disabled={index === 0} onClick={() => moveUp(index)}>
                ↑
              </button>
              <button className="btn btn-secondary" disabled={index === images.length - 1} onClick={() => moveDown(index)}>
                ↓
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(img.id)}>
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Nenhuma imagem cadastrada.</p>}

      <div className="upload-section">
        <h2>Adicionar Imagem</h2>
        {images.length >= 10 ? (
          <p className="limit-msg">Limite de 10 imagens atingido.</p>
        ) : (
          <>
            <label className="upload-label">
              {uploading ? 'Enviando...' : 'Selecionar arquivo (JPEG, PNG, WebP — máx. 10MB)'}
              <input
                ref={fileInput}
                className="upload-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
            {uploading && <p className="upload-progress">Enviando imagem...</p>}
          </>
        )}
      </div>
    </div>
  );
}
