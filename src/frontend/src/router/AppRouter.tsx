import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from '../components/routing/PrivateRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { LoginPage } from '../pages/LoginPage';
import { HomePage } from '../pages/HomePage';

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
          <Route path="/*" element={<div>Página em construção</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
