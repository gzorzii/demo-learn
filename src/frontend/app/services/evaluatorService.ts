import api from './api';
import type { EvaluatorListResponse, EvaluatorItem } from '../types/evaluator';

export async function fetchEvaluators(cycleSubjectId: string): Promise<EvaluatorListResponse> {
  const res = await api.get(`/api/me/cycles/${cycleSubjectId}/evaluators`);
  return res.data;
}

export async function fetchEvaluatorsForPdm(subjectUserId: string, cycleSubjectId: string): Promise<EvaluatorListResponse> {
  const res = await api.get(`/api/my-team/${subjectUserId}/cycles/${cycleSubjectId}/evaluators`);
  return res.data;
}

export async function addEvaluator(cycleSubjectId: string, userId: string): Promise<EvaluatorItem> {
  const res = await api.post(`/api/me/cycles/${cycleSubjectId}/evaluators`, { userId });
  return res.data;
}

export async function addEvaluatorForPdm(subjectUserId: string, cycleSubjectId: string, userId: string): Promise<EvaluatorItem> {
  const res = await api.post(`/api/my-team/${subjectUserId}/cycles/${cycleSubjectId}/evaluators`, { userId });
  return res.data;
}

export async function removeEvaluator(cycleSubjectId: string, evaluatorId: string): Promise<void> {
  await api.delete(`/api/me/cycles/${cycleSubjectId}/evaluators/${evaluatorId}`);
}

export async function confirmEvaluators(cycleSubjectId: string): Promise<void> {
  await api.post(`/api/me/cycles/${cycleSubjectId}/evaluators/confirm`);
}
