import axios from 'axios';
import type { CfProgressDTO, PdmCfProgressDTO } from '../types/cfProgress';

export async function getColaboradorProgress(cycleSubjectId: string): Promise<CfProgressDTO> {
  const res = await axios.get(`/api/me/ciclos/cf/${cycleSubjectId}/progresso`);
  return res.data;
}

export async function getPdmProgress(colaboradorId: string, cycleSubjectId: string): Promise<PdmCfProgressDTO> {
  const res = await axios.get(`/api/me/team/${colaboradorId}/cycles/${cycleSubjectId}/progresso`);
  return res.data;
}

export async function closeCfCycle(cycleSubjectId: string): Promise<void> {
  await axios.post(`/api/me/ciclos/cf/${cycleSubjectId}/encerrar`);
}
