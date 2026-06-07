/**
 * Shared TypeScript types for the LLM Prompt Lab frontend.
 */

export interface Experiment {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
}

export interface ExperimentDetail extends Experiment {
  variants: PromptVariant[];
}

export interface PromptVariant {
  id: number;
  experiment_id: number;
  label: string;
  system_prompt: string | null;
  user_prompt: string;
  created_at: string;
}

export interface Run {
  id: number;
  variant_id: number;
  model_name: string;
  output: string;
  latency_ms: number;
  prompt_tokens: number;
  completion_tokens: number;
  score: number | null;
  created_at: string;
}

export interface VariantStats {
  variant_id: number;
  label: string;
  run_count: number;
  avg_score: number | null;
  avg_latency_ms: number | null;
  avg_tokens: number | null;
}

export interface ExperimentStats {
  experiment_id: number;
  variants: VariantStats[];
}
