export interface BookImage {
  id: string;
  url: string;
  order: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  publisher: string | null;
  year: number | null;
  category: string;
  condition: 'new' | 'used';
  conditionDescription: string | null;
  salePrice: number;
  description: string | null;
  shelfLocation: string | null;
  branchId: string;
  registeredAt: string;
  active: boolean;
  stockQuantity: number;
  images: BookImage[];
}

export interface BookSummary {
  id: string;
  title: string;
  author: string;
  category: string;
  condition: 'new' | 'used';
  salePrice: number;
  stockQuantity: number;
  shelfLocation: string | null;
}

export interface BookPage {
  content: BookSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface IsbnPrefill {
  title: string;
  author: string;
  publisher: string | null;
  year: number | null;
  category: string;
}

export interface BookCreateRequest {
  title: string;
  author: string;
  isbn: string;
  publisher?: string;
  year?: number;
  category: string;
  condition: 'new' | 'used';
  conditionDescription?: string;
  salePrice: number;
  quantity?: number;
  shelfLocation?: string;
  description?: string;
  lotId?: string;
}

export interface BookUpdateRequest {
  title: string;
  author: string;
  isbn: string;
  publisher?: string;
  year?: number;
  category: string;
  conditionDescription?: string;
  salePrice: number;
  quantity?: number;
  shelfLocation?: string;
  description?: string;
}
