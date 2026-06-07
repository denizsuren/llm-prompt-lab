import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Play, Trash2, BarChart2 } from 'lucide-react';
import {
  getExperiment,
  createVariant,
  deleteVariant,
  executeRun,
  listRuns,
  scoreRun,
  deleteRun,
  getExperimentStats,
  listModels,
} from '../api';
import type { ExperimentDetail, PromptVariant, Run, ExperimentStats } from '../types';
import NewVariantModal from '../components/NewVariantModal';
import StarRating from '../components/StarRating';
import StatsCharts from '../components/StatsCharts';

type Tab = 'variants' | 'runs' | 'stats';

export default function ExperimentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const expId = Number(id);

  const [experiment, setExperiment] = useState<ExperimentDetail | null>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [stats, setStats] = useState<ExperimentStats | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('llama3.2');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(512);
  const [runningVariantId, setRunningVariantId] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>('variants');
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      const [exp, runList, statsData, modelList] = await Promise.all([
        getExperiment(expId),
        listRuns({ experiment_id: expId }),
        getExperimentStats(expId),
        listModels(),
      ]);
      setExperiment(exp);
      setRuns(runList);
      setStats(statsData);
      if (modelList.length > 0) {
        setModels(modelList);
        setSelectedModel(modelList[0]);
      }
    } catch {
      setError('Failed to load experiment data.');
    } finally {
      setLoading(false);
    }
  }, [expId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleAddVariant = async (label: string, userPrompt: string, systemPrompt: string) => {
    const variant = await createVariant(expId, label, userPrompt, systemPrompt || undefined);
    setExperiment((prev) =>
      prev ? { ...prev, variants: [...prev.variants, variant] } : prev
    );
    const statsData = await getExperimentStats(expId);
    setStats(statsData);
  };

  const handleDeleteVariant = async (variantId: number) => {
    if (!confirm('Delete this variant and all its runs?')) return;
    await deleteVariant(expId, variantId);
    setExperiment((prev) =>
      prev ? { ...prev, variants: prev.variants.filter((v) => v.id !== variantId) } : prev
    );
    const [runList, statsData] = await Promise.all([
      listRuns({ experiment_id: expId }),
      getExperimentStats(expId),
    ]);
    setRuns(runList);
    setStats(statsData);
  };

  const handleRun = async (variant: PromptVariant) => {
    setRunningVariantId(variant.id);
    setError('');
    try {
      const run = await executeRun(variant.id, selectedModel, temperature, maxTokens);
      setRuns((prev) => [run, ...prev]);
      const statsData = await getExperimentStats(expId);
      setStats(statsData);
      setTab('runs');
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'LLM request failed. Is Ollama running?';
      setError(detail);
    } finally {
      setRunningVariantId(null);
    }
  };

  const handleScore = async (runId: number, score: number) => {
    const updated = await scoreRun(runId, score);
    setRuns((prev) => prev.map((r) => (r.id === runId ? updated : r)));
    const statsData = await getExperimentStats(expId);
    setStats(statsData);
  };

  const handleDeleteRun = async (runId: number) => {
    if (!confirm('Delete this run?')) return;
    await deleteRun(runId);
    setRuns((prev) => prev.filter((r) => r.id !== runId));
    const statsData = await getExperimentStats(expId);
    setStats(statsData);
  };

  const getVariantLabel = (variantId: number) =>
    experiment?.variants.find((v) => v.id === variantId)?.label ?? `#${variantId}`;

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!experiment) {
    return <div className="alert alert-error">Experiment not found.</div>;
  }

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: '1.4rem' }}>{experiment.name}</h1>
            {experiment.description && (
              <p className="text-secondary text-sm">{experiment.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Model selector */}
          {models.length > 0 ? (
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ width: 180 }}
              aria-label="Select LLM model"
            >
              {models.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          ) : (
            <input
              type="text"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{ width: 180 }}
              placeholder="model name"
              aria-label="Model name"
            />
          )}
          <button className="btn btn-primary" onClick={() => setShowVariantModal(true)}>
            <Plus size={16} />
            Add Variant
          </button>
        </div>
      </div>

      {/* ── Params row ── */}
      <div className="card-sm flex items-center gap-4 mb-4" style={{ maxWidth: 420 }}>
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="temp-input">Temperature</label>
          <input
            id="temp-input"
            type="number"
            min={0} max={2} step={0.1}
            value={temperature}
            onChange={(e) => setTemperature(Number(e.target.value))}
          />
        </div>
        <div className="form-group" style={{ flex: 1 }}>
          <label htmlFor="tokens-input">Max Tokens</label>
          <input
            id="tokens-input"
            type="number"
            min={64} max={4096} step={64}
            value={maxTokens}
            onChange={(e) => setMaxTokens(Number(e.target.value))}
          />
        </div>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {/* ── Tabs ── */}
      <div className="tabs">
        {(['variants', 'runs', 'stats'] as Tab[]).map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'runs' && runs.length > 0 && (
              <span className="badge badge-purple" style={{ marginLeft: 8, padding: '2px 6px' }}>
                {runs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Variants Tab ── */}
      {tab === 'variants' && (
        experiment.variants.length === 0 ? (
          <div className="empty-state">
            <h3>No variants yet</h3>
            <p>Add prompt variants to compare different approaches.</p>
            <button className="btn btn-primary" onClick={() => setShowVariantModal(true)}>
              <Plus size={16} /> Add Variant
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {experiment.variants.map((v) => (
              <div key={v.id} className="card" style={{ position: 'relative' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-purple">{v.label}</span>
                    <span className="text-muted text-xs">variant #{v.id}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={runningVariantId === v.id}
                      onClick={() => handleRun(v)}
                    >
                      {runningVariantId === v.id
                        ? <><span className="spinner" /> Running…</>
                        : <><Play size={13} /> Run</>
                      }
                    </button>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => handleDeleteVariant(v.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {v.system_prompt && (
                  <div className="mb-3">
                    <div className="text-xs text-muted mb-1">System prompt</div>
                    <div className="output-block" style={{ maxHeight: 80 }}>{v.system_prompt}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs text-muted mb-1">User prompt</div>
                  <div className="output-block" style={{ maxHeight: 120 }}>{v.user_prompt}</div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Runs Tab ── */}
      {tab === 'runs' && (
        runs.length === 0 ? (
          <div className="empty-state">
            <h3>No runs yet</h3>
            <p>Run a variant to see results here.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {runs.map((run) => (
              <div key={run.id} className="card">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-purple">{getVariantLabel(run.variant_id)}</span>
                    <span className="badge badge-green">{run.model_name}</span>
                    <span className="text-muted text-xs">{Math.round(run.latency_ms)} ms</span>
                    {run.completion_tokens > 0 && (
                      <span className="text-muted text-xs">{run.completion_tokens} tokens</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <StarRating
                      runId={run.id}
                      currentScore={run.score}
                      onScore={handleScore}
                    />
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => handleDeleteRun(run.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="output-block">{run.output}</div>
                <p className="text-muted text-xs mt-2">
                  {new Date(run.created_at).toLocaleString('en-GB')}
                </p>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Stats Tab ── */}
      {tab === 'stats' && (
        <>
          {stats && stats.variants.length > 0 && (
            <>
              {/* Summary table */}
              <div className="table-wrap mb-4">
                <table>
                  <thead>
                    <tr>
                      <th>Variant</th>
                      <th>Runs</th>
                      <th>Avg Score</th>
                      <th>Avg Latency</th>
                      <th>Avg Tokens</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.variants.map((v) => (
                      <tr key={v.variant_id}>
                        <td><span className="badge badge-purple">{v.label}</span></td>
                        <td>{v.run_count}</td>
                        <td>
                          {v.avg_score != null
                            ? <span className="text-yellow font-mono">{v.avg_score.toFixed(2)} ★</span>
                            : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {v.avg_latency_ms != null
                            ? <span className="font-mono">{Math.round(v.avg_latency_ms)} ms</span>
                            : '—'}
                        </td>
                        <td>
                          {v.avg_tokens != null
                            ? <span className="font-mono">{Math.round(v.avg_tokens)}</span>
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="card">
                <StatsCharts stats={stats} />
              </div>
            </>
          )}

          {(!stats || stats.variants.length === 0) && (
            <div className="empty-state">
              <BarChart2 size={48} />
              <h3>No statistics yet</h3>
              <p>Add variants and run them to see charts here.</p>
            </div>
          )}
        </>
      )}

      {showVariantModal && (
        <NewVariantModal
          onClose={() => setShowVariantModal(false)}
          onSubmit={handleAddVariant}
        />
      )}
    </>
  );
}
