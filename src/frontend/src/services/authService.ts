const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export const authService = {
  async login(email: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email }),
    });
    if (!response.ok) {
      throw new Error(String(response.status));
    }
  },
};
