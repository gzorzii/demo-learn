import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookService } from '../../services/bookService';
import type { Book } from '../../types/book';
import './BookFormPage.css';

interface FormState {
  title: string; author: string; isbn: string; publisher: string; year: string;
  category: string; condition: 'new' | 'used'; conditionDescription: string;
  salePrice: string; quantity: string; shelfLocation: string; description: string;
  lotId: string;
}

function emptyForm(): FormState {
  return {
    title: '', author: '', isbn: '', publisher: '', year: '',
    category: '', condition: 'new', conditionDescription: '',
    salePrice: '', quantity: '1', shelfLocation: '', description: '', lotId: '',
  };
}

function bookToForm(b: Book): FormState {
  return {
    title: b.title, author: b.author, isbn: b.isbn ?? '', publisher: b.publisher ?? '',
    year: b.year ? String(b.year) : '', category: b.category,
    condition: b.condition, conditionDescription: b.conditionDescription ?? '',
    salePrice: String(b.salePrice), quantity: String(b.stockQuantity),
    shelfLocation: b.shelfLocation ?? '', description: b.description ?? '', lotId: '',
  };
}

export function BookFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [apiError, setApiError] = useState('');
  const [isbnLookup, setIsbnLookup] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    bookService.getById(id)
      .then(b => setForm(bookToForm(b)))
      .catch(() => setApiError('Erro ao carregar livro.'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function set(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  async function handleIsbnBlur() {
    if (!form.isbn || isEdit) return;
    setIsbnLookup(true);
    const prefill = await bookService.isbnPrefill(form.isbn);
    if (prefill) {
      setForm(f => ({
        ...f,
        title: prefill.title || f.title,
        author: prefill.author || f.author,
        publisher: prefill.publisher ?? f.publisher,
        year: prefill.year ? String(prefill.year) : f.year,
        category: prefill.category || f.category,
      }));
    }
    setIsbnLookup(false);
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.title.trim()) e.title = 'Título obrigatório';
    if (!form.author.trim()) e.author = 'Autor obrigatório';
    if (!form.isbn.trim()) e.isbn = 'ISBN obrigatório';
    if (!form.category.trim()) e.category = 'Categoria obrigatória';
    if (!form.salePrice || Number(form.salePrice) <= 0) e.salePrice = 'Preço deve ser maior que zero';
    if (!isEdit && form.condition === 'new' && (!form.quantity || Number(form.quantity) < 1)) {
      e.quantity = 'Quantidade mínima 1';
    }
    if (form.condition === 'used' && !form.conditionDescription.trim()) {
      e.conditionDescription = 'Descrição da condição obrigatória para livro usado';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    setApiError('');
    try {
      let book: Book;
      if (isEdit && id) {
        book = await bookService.update(id, {
          title: form.title, author: form.author, isbn: form.isbn,
          publisher: form.publisher || undefined, year: form.year ? Number(form.year) : undefined,
          category: form.category, conditionDescription: form.conditionDescription || undefined,
          salePrice: Number(form.salePrice),
          quantity: form.quantity ? Number(form.quantity) : undefined,
          shelfLocation: form.shelfLocation || undefined, description: form.description || undefined,
        });
      } else {
        book = await bookService.create({
          title: form.title, author: form.author, isbn: form.isbn,
          publisher: form.publisher || undefined, year: form.year ? Number(form.year) : undefined,
          category: form.category, condition: form.condition,
          conditionDescription: form.conditionDescription || undefined,
          salePrice: Number(form.salePrice),
          quantity: form.condition === 'new' ? Number(form.quantity) : undefined,
          shelfLocation: form.shelfLocation || undefined, description: form.description || undefined,
          lotId: form.lotId || undefined,
        });
      }
      navigate(`/books/${book.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === '400') setApiError('Dados inválidos. Verifique os campos.');
      else if (msg === '404') setApiError('Lote não encontrado na filial.');
      else setApiError('Erro ao salvar livro.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="status-msg">Carregando...</p>;

  return (
    <div className="book-form-page">
      <h1>{isEdit ? 'Editar Livro' : 'Cadastrar Livro'}</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="form-group">
            <label>ISBN <span className="required">*</span></label>
            <input
              value={form.isbn} onChange={e => set('isbn', e.target.value)}
              onBlur={handleIsbnBlur}
              disabled={isbnLookup}
              placeholder={isbnLookup ? 'Buscando...' : 'ISBN-10 ou ISBN-13'}
            />
            {errors.isbn && <span className="field-error">{errors.isbn}</span>}
          </div>

          {!isEdit && (
            <div className="form-group">
              <label>Condição <span className="required">*</span></label>
              <select value={form.condition} onChange={e => set('condition', e.target.value as 'new' | 'used')}>
                <option value="new">Novo</option>
                <option value="used">Usado</option>
              </select>
            </div>
          )}
          {isEdit && (
            <div className="form-group">
              <label>Condição</label>
              <input readOnly value={form.condition === 'new' ? 'Novo' : 'Usado'} />
            </div>
          )}

          <div className="form-group">
            <label>Título <span className="required">*</span></label>
            <input value={form.title} onChange={e => set('title', e.target.value)} />
            {errors.title && <span className="field-error">{errors.title}</span>}
          </div>

          <div className="form-group">
            <label>Autor <span className="required">*</span></label>
            <input value={form.author} onChange={e => set('author', e.target.value)} />
            {errors.author && <span className="field-error">{errors.author}</span>}
          </div>

          <div className="form-group">
            <label>Editora</label>
            <input value={form.publisher} onChange={e => set('publisher', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Ano</label>
            <input type="number" value={form.year} onChange={e => set('year', e.target.value)} min={1} />
          </div>

          <div className="form-group">
            <label>Categoria <span className="required">*</span></label>
            <input value={form.category} onChange={e => set('category', e.target.value)} />
            {errors.category && <span className="field-error">{errors.category}</span>}
          </div>

          <div className="form-group">
            <label>Preço de Venda (R$) <span className="required">*</span></label>
            <input type="number" step="0.01" min="0.01" value={form.salePrice}
              onChange={e => set('salePrice', e.target.value)} />
            {errors.salePrice && <span className="field-error">{errors.salePrice}</span>}
          </div>

          {form.condition === 'new' && (
            <div className="form-group">
              <label>Quantidade <span className="required">*</span></label>
              <input type="number" min="1" value={form.quantity}
                onChange={e => set('quantity', e.target.value)} />
              {errors.quantity && <span className="field-error">{errors.quantity}</span>}
            </div>
          )}

          <div className="form-group">
            <label>Prateleira</label>
            <input value={form.shelfLocation} onChange={e => set('shelfLocation', e.target.value)} />
          </div>

          {form.condition === 'used' && (
            <div className="form-group full">
              <label>Descrição da Condição <span className="required">*</span></label>
              <textarea value={form.conditionDescription}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('conditionDescription', e.target.value)} />
              {errors.conditionDescription && <span className="field-error">{errors.conditionDescription}</span>}
            </div>
          )}

          {!isEdit && form.condition === 'used' && (
            <div className="form-group">
              <label>ID do Lote (opcional)</label>
              <input value={form.lotId} onChange={e => set('lotId', e.target.value)}
                placeholder="UUID do lote de compra" />
            </div>
          )}

          <div className="form-group full">
            <label>Descrição</label>
            <textarea value={form.description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => set('description', e.target.value)} />
          </div>
        </div>

        {apiError && <p className="api-error">{apiError}</p>}

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Cadastrar Livro'}
          </button>
          <button type="button" className="btn btn-secondary"
            onClick={() => navigate(isEdit && id ? `/books/${id}` : '/books')}>
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
