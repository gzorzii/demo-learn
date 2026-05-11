import type {
  Book,
  BookCreateRequest,
  BookImage,
  BookPage,
  BookUpdateRequest,
  IsbnPrefill,
} from '../types/book';

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

type SnakeBook = {
  id: string; title: string; author: string; isbn: string | null;
  publisher: string | null; year: number | null; category: string;
  condition: 'new' | 'used'; condition_description: string | null;
  sale_price: number; description: string | null; shelf_location: string | null;
  branch_id: string; registered_at: string; active: boolean;
  stock_quantity: number; images: SnakeImage[];
};
type SnakeImage = { id: string; url: string; order: number };
type SnakeSummary = {
  id: string; title: string; author: string; category: string;
  condition: 'new' | 'used'; sale_price: number; stock_quantity: number;
  shelf_location: string | null;
};
type SnakePage = {
  content: SnakeSummary[]; page: number; size: number;
  total_elements: number; total_pages: number;
};

function mapBook(s: SnakeBook): Book {
  return {
    id: s.id, title: s.title, author: s.author, isbn: s.isbn,
    publisher: s.publisher, year: s.year, category: s.category,
    condition: s.condition, conditionDescription: s.condition_description,
    salePrice: s.sale_price, description: s.description,
    shelfLocation: s.shelf_location, branchId: s.branch_id,
    registeredAt: s.registered_at, active: s.active,
    stockQuantity: s.stock_quantity,
    images: (s.images ?? []).map(i => ({ id: i.id, url: i.url, order: i.order })),
  };
}

function mapPage(s: SnakePage): BookPage {
  return {
    content: s.content.map(c => ({
      id: c.id, title: c.title, author: c.author, category: c.category,
      condition: c.condition, salePrice: c.sale_price,
      stockQuantity: c.stock_quantity, shelfLocation: c.shelf_location,
    })),
    page: s.page, size: s.size,
    totalElements: s.total_elements, totalPages: s.total_pages,
  };
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) throw new Error(String(res.status));
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const bookService = {
  async list(params: {
    condition?: string; category?: string; minPrice?: number; maxPrice?: number;
    sort?: string; direction?: string; page?: number; size?: number; branchId?: string;
  }): Promise<BookPage> {
    const q = new URLSearchParams();
    if (params.condition) q.set('condition', params.condition);
    if (params.category) q.set('category', params.category);
    if (params.minPrice != null) q.set('min_price', String(params.minPrice));
    if (params.maxPrice != null) q.set('max_price', String(params.maxPrice));
    if (params.sort) q.set('sort', params.sort);
    if (params.direction) q.set('direction', params.direction);
    if (params.page != null) q.set('page', String(params.page));
    if (params.size != null) q.set('size', String(params.size));
    if (params.branchId) q.set('branch_id', params.branchId);
    const raw = await request<SnakePage>(`/books?${q}`);
    return mapPage(raw);
  },

  async search(params: { q: string; page?: number; size?: number; branchId?: string }): Promise<BookPage> {
    const q = new URLSearchParams({ q: params.q });
    if (params.page != null) q.set('page', String(params.page));
    if (params.size != null) q.set('size', String(params.size));
    if (params.branchId) q.set('branch_id', params.branchId);
    const raw = await request<SnakePage>(`/books/search?${q}`);
    return mapPage(raw);
  },

  async getById(id: string): Promise<Book> {
    const raw = await request<SnakeBook>(`/books/${id}`);
    return mapBook(raw);
  },

  async create(data: BookCreateRequest): Promise<Book> {
    const body: Record<string, unknown> = {
      title: data.title, author: data.author, isbn: data.isbn,
      publisher: data.publisher, year: data.year, category: data.category,
      condition: data.condition, conditionDescription: data.conditionDescription,
      salePrice: data.salePrice, quantity: data.quantity,
      shelfLocation: data.shelfLocation, description: data.description,
      lotId: data.lotId,
    };
    const raw = await request<SnakeBook>('/books', { method: 'POST', body: JSON.stringify(body) });
    return mapBook(raw);
  },

  async update(id: string, data: BookUpdateRequest): Promise<Book> {
    const body: Record<string, unknown> = {
      title: data.title, author: data.author, isbn: data.isbn,
      publisher: data.publisher, year: data.year, category: data.category,
      conditionDescription: data.conditionDescription, salePrice: data.salePrice,
      quantity: data.quantity, shelfLocation: data.shelfLocation,
      description: data.description,
    };
    const raw = await request<SnakeBook>(`/books/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    return mapBook(raw);
  },

  async isbnPrefill(isbn: string): Promise<IsbnPrefill | null> {
    try {
      const data = await request<{
        title: string; author: string; publisher: string | null;
        year: number | null; category: string;
      }>(`/books/isbn-prefill?isbn=${encodeURIComponent(isbn)}`);
      return data;
    } catch (e) {
      if (e instanceof Error && e.message === '404') return null;
      return null;
    }
  },

  async uploadImage(bookId: string, file: File): Promise<BookImage> {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/books/${bookId}/images`, {
      method: 'POST',
      credentials: 'include',
      body: form,
    });
    if (!res.ok) throw new Error(String(res.status));
    return res.json() as Promise<BookImage>;
  },

  async reorderImages(bookId: string, order: Array<{ imageId: string; order: number }>): Promise<BookImage[]> {
    const body = { order: order.map(o => ({ image_id: o.imageId, order: o.order })) };
    return request<BookImage[]>(`/books/${bookId}/images/reorder`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  async deleteImage(bookId: string, imageId: string): Promise<void> {
    await request<void>(`/books/${bookId}/images/${imageId}`, { method: 'DELETE' });
  },
};
