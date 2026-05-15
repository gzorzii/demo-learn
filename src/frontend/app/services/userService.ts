import api from './api';
import type { UserSearchResponse } from '../types/user';

export async function searchUsers(term: string): Promise<UserSearchResponse> {
  const res = await api.get(`/api/users/search`, { params: { q: term } });
  return res.data;
}
