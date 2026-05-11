import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from '../components/routing/PrivateRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';
import { BookListPage } from '../pages/books/BookListPage';
import { BookDetailPage } from '../pages/books/BookDetailPage';
import { BookFormPage } from '../pages/books/BookFormPage';
import { BookSearchPage } from '../pages/books/BookSearchPage';
import { BookImagesPage } from '../pages/books/BookImagesPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="/" element={<HomePage />} />
          <Route path="/books" element={<BookListPage />} />
          <Route path="/books/search" element={<BookSearchPage />} />
          <Route path="/books/new" element={<BookFormPage />} />
          <Route path="/books/:id/edit" element={<BookFormPage />} />
          <Route path="/books/:id/images" element={<BookImagesPage />} />
          <Route path="/books/:id" element={<BookDetailPage />} />
          <Route path="/*" element={<div>Página em construção</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
