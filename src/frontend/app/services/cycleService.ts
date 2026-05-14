import api from './api';
import type { ActiveCyclesResponse } from '../types/cycle';

export async function fetchActiveCycles(): Promise<ActiveCyclesResponse> {
  const res = await api.get<ActiveCyclesResponse>('/api/me/cycles/active');
  return res.data;
}
