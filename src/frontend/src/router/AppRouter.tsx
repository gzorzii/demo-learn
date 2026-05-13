import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import { PrivateRoute } from '../components/routing/PrivateRoute';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <HomePage />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
