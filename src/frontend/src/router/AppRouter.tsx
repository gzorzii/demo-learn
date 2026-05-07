import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { PrivateRoute } from '../components/routing/PrivateRoute';
import { LoginPage } from '../pages/LoginPage';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <div>Home — em construção</div>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
