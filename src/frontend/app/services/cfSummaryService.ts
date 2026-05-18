import axios from 'axios';
import type { CfSummaryDTO, PdmCfSummaryDTO } from '../types/cfSummary';

export async function getColaboradorSummary(cycleSubjectId: string): Promise<CfSummaryDTO> {
  const { data } = await axios.get<CfSummaryDTO>(`/api/me/ciclos/cf/${cycleSubjectId}/resumo`);
  return data;
}

export async function getPdmSummary(colaboradorId: string, cycleSubjectId: string): Promise<PdmCfSummaryDTO> {
  const { data } = await axios.get<PdmCfSummaryDTO>(`/api/me/team/${colaboradorId}/cycles/${cycleSubjectId}/resumo`);
  return data;
}