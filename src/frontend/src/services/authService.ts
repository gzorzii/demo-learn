const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

async function post(path: string, body: unknown): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(String(response.status));
  }
}

export const authService = {
  login: (email: string) => post('/auth/login', { email }),
  googleLogin: (idToken: string) => post('/auth/google', { idToken }),
};
