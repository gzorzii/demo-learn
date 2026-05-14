import api from './api';
import type { TeamMembersResponse } from '../types/team';

export async function fetchTeamMembers(): Promise<TeamMembersResponse> {
  const res = await api.get<TeamMembersResponse>('/api/my-team');
  return res.data;
}

export async function startCf(subjectUserId: string): Promise<void> {
  await api.post(`/api/my-team/${subjectUserId}/cycles/cf`);
}
