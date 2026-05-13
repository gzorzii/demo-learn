import api from './api';

function clearAuthCookie() {
  document.cookie = 'auth_info=; Max-Age=0; path=/';
}

export const authService = {
  login: (email: string) => api.post('/auth/login', { email }),
  googleLogin: (idToken: string) => api.post('/auth/google', { idToken }),
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // server error não impede logout local
    } finally {
      clearAuthCookie();
    }
  },
};