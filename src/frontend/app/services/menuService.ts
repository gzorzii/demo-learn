import api from './api';
import type { MenuResponse } from '../types/menu';

export async function fetchMenu(): Promise<MenuResponse> {
  const response = await api.get<MenuResponse>('/api/me/menu');
  return response.data;
}
