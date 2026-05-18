import api from './api';
import type { EvaluationContextDTO, PendingEvaluationItem } from '../types/evaluation';

export async function listPendingEvaluations(): Promise<PendingEvaluationItem[]> {
  const res = await api.get('/api/me/avaliacoes/cf');
  return res.data;
}

export async function getEvaluationContext(evaluatorId: string): Promise<EvaluationContextDTO> {
  const res = await api.get(`/api/me/avaliacoes/cf/${evaluatorId}`);
  return res.data;
}

export async function saveDraft(evaluatorId: string, draftText: string): Promise<void> {
  await api.put(`/api/me/avaliacoes/cf/${evaluatorId}/rascunho`, { draftText });
}

export async function submitEvaluation(evaluatorId: string, responseText: string): Promise<void> {
  await api.post(`/api/me/avaliacoes/cf/${evaluatorId}`, { responseText });
}