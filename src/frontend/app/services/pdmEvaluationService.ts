import api from './api';
import type { PdmEvaluationContextDTO } from '../types/pdmEvaluation';

export async function getPdmEvaluationContext(
  colaboradorId: string,
  cycleSubjectId: string
): Promise<PdmEvaluationContextDTO> {
  const res = await api.get(
    `/api/me/team/${colaboradorId}/cycles/${cycleSubjectId}/pdm-evaluation`
  );
  return res.data;
}

export async function savePdmDraft(
  colaboradorId: string,
  cycleSubjectId: string,
  resultadoDraft: string,
  prontidaoDraft: string,
  actionDraft: string
): Promise<void> {
  await api.put(
    `/api/me/team/${colaboradorId}/cycles/${cycleSubjectId}/pdm-evaluation/draft`,
    { resultadoDraft, prontidaoDraft, actionDraft }
  );
}

export async function submitPdmEvaluation(
  colaboradorId: string,
  cycleSubjectId: string,
  resultado: string,
  prontidao: string,
  action: string
): Promise<void> {
  await api.post(
    `/api/me/team/${colaboradorId}/cycles/${cycleSubjectId}/pdm-evaluation/submit`,
    { resultado, prontidao, action }
  );
}
