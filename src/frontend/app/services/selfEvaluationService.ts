import api from './api';
import type { SelfEvaluationContextDTO } from '../types/evaluation';

export async function getSelfEvaluationContext(cycleSubjectId: string): Promise<SelfEvaluationContextDTO> {
  const res = await api.get(`/api/me/ciclos/cf/${cycleSubjectId}/autoavaliacao`);
  return res.data;
}

export async function saveSelfDraft(cycleSubjectId: string, draftText: string): Promise<void> {
  await api.put(`/api/me/ciclos/cf/${cycleSubjectId}/autoavaliacao/rascunho`, { draftText });
}

export async function submitSelfEvaluation(cycleSubjectId: string, responseText: string): Promise<void> {
  await api.post(`/api/me/ciclos/cf/${cycleSubjectId}/autoavaliacao/submit`, { responseText });
}
