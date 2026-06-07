import { useEffect, useState } from 'react';
import { List, Trash2 } from 'lucide-react';
import { listRuns, scoreRun, deleteRun } from '../api';
import type { Run } from '../types';
import StarRating from '../components/StarRating';

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listRuns({})
      .then(setRuns)
      .catch(() => setError('Could not load runs.'))
      .finally(() => setLoading(false));
  }, []);

  const handleScore = async (runId: number, score: number) => {
    const updated = await scoreRun(runId, score);
    setRuns((prev) => prev.map((r) => (r.id === runId ? updated : r)));
  };

  const handleDelete = async (runId: number) => {
    if (!confirm('Delete this run?')) return;
    await deleteRun(runId);
    setRuns((prev) => prev.filter((r) => r.id !== runId));
  };

  return (
    <>
      <div className="page-header">
        <h1>
          <List size={28} color="var(--accent)" />
          All Runs
        </h1>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : runs.length === 0 ? (
        <div className="empty-state">
          <List size={48} />
          <h3>No runs yet</h3>
          <p>Run a prompt variant from an experiment to see results here.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Variant</th>
                <th>Model</th>
                <th>Latency</th>
                <th>Tokens</th>
                <th>Score</th>
                <th>Output (preview)</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.id}>
                  <td>
                    <span className="badge badge-purple">#{run.variant_id}</span>
                  </td>
                  <td>
                    <span className="badge badge-green">{run.model_name}</span>
                  </td>
                  <td className="font-mono text-sm">{Math.round(run.latency_ms)} ms</td>
                  <td className="font-mono text-sm">{run.completion_tokens || '—'}</td>
                  <td>
                    <StarRating runId={run.id} currentScore={run.score} onScore={handleScore} />
                  </td>
                  <td
                    className="text-sm text-secondary"
                    style={{ maxWidth: 280 }}
                  >
                    <span className="truncate" style={{ display: 'block', maxWidth: 260 }}>
                      {run.output.slice(0, 120)}{run.output.length > 120 ? '…' : ''}
                    </span>
                  </td>
                  <td className="text-muted text-xs" style={{ whiteSpace: 'nowrap' }}>
                    {new Date(run.created_at).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td>
                    <button
                      className="btn btn-danger btn-sm btn-icon"
                      onClick={() => handleDelete(run.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
