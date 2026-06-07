import axios from 'axios';
import type {
  Experiment,
  ExperimentDetail,
  PromptVariant,
  Run,
  ExperimentStats,
} from './types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000',
});

// ── Experiments ───────────────────────────────────────────────────────────────

export const listExperiments = (): Promise<Experiment[]> =>
  api.get('/api/experiments/').then((r) => r.data);

export const createExperiment = (name: string, description?: string): Promise<Experiment> =>
  api.post('/api/experiments/', { name, description }).then((r) => r.data);

export const getExperiment = (id: number): Promise<ExperimentDetail> =>
  api.get(`/api/experiments/${id}`).then((r) => r.data);

export const deleteExperiment = (id: number): Promise<void> =>
  api.delete(`/api/experiments/${id}`).then(() => undefined);

// ── Variants ─────────────────────────────────────────────────────────────────

export const createVariant = (
  experimentId: number,
  label: string,
  userPrompt: string,
  systemPrompt?: string,
): Promise<PromptVariant> =>
  api
    .post(`/api/experiments/${experimentId}/variants`, {
      label,
      user_prompt: userPrompt,
      system_prompt: systemPrompt ?? null,
    })
    .then((r) => r.data);

export const deleteVariant = (experimentId: number, variantId: number): Promise<void> =>
  api.delete(`/api/experiments/${experimentId}/variants/${variantId}`).then(() => undefined);

// ── Runs ──────────────────────────────────────────────────────────────────────

export const executeRun = (
  variantId: number,
  modelName: string,
  temperature = 0.7,
  maxTokens = 512,
): Promise<Run> =>
  api
    .post('/api/runs/', {
      variant_id: variantId,
      model_name: modelName,
      temperature,
      max_tokens: maxTokens,
    })
    .then((r) => r.data);

export const listRuns = (params: { variant_id?: number; experiment_id?: number }): Promise<Run[]> =>
  api.get('/api/runs/', { params }).then((r) => r.data);

export const scoreRun = (runId: number, score: number): Promise<Run> =>
  api.patch(`/api/runs/${runId}/score`, { score }).then((r) => r.data);

export const deleteRun = (runId: number): Promise<void> =>
  api.delete(`/api/runs/${runId}`).then(() => undefined);

export const getExperimentStats = (experimentId: number): Promise<ExperimentStats> =>
  api.get(`/api/runs/stats/${experimentId}`).then((r) => r.data);

// ── Models ────────────────────────────────────────────────────────────────────

export const listModels = (): Promise<string[]> =>
  api.get('/api/models/').then((r) => r.data);
