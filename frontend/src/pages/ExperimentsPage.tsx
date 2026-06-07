import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FlaskConical, Plus, Trash2, ArrowRight } from 'lucide-react';
import { listExperiments, createExperiment, deleteExperiment } from '../api';
import type { Experiment } from '../types';
import NewExperimentModal from '../components/NewExperimentModal';

export default function ExperimentsPage() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchExperiments = async () => {
    try {
      const data = await listExperiments();
      setExperiments(data);
    } catch {
      setError('Could not reach the backend. Is it running on port 8000?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchExperiments(); }, []);

  const handleCreate = async (name: string, description: string) => {
    const exp = await createExperiment(name, description);
    setExperiments((prev) => [exp, ...prev]);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!confirm('Delete this experiment and all its data?')) return;
    await deleteExperiment(id);
    setExperiments((prev) => prev.filter((ex) => ex.id !== id));
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <>
      <div className="page-header">
        <h1>
          <FlaskConical size={28} color="var(--accent)" />
          Experiments
        </h1>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} />
          New Experiment
        </button>
      </div>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <span className="spinner" style={{ width: 32, height: 32 }} />
        </div>
      ) : experiments.length === 0 ? (
        <div className="empty-state">
          <FlaskConical size={48} />
          <h3>No experiments yet</h3>
          <p>Create your first experiment to start benchmarking prompt variants.</p>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            New Experiment
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {experiments.map((exp) => (
            <div
              key={exp.id}
              className="card"
              style={{ cursor: 'pointer', transition: 'border-color 150ms, box-shadow 150ms' }}
              onClick={() => navigate(`/experiments/${exp.id}`)}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div className="flex items-center justify-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ marginBottom: 4 }}>{exp.name}</h3>
                  {exp.description && (
                    <p className="text-secondary text-sm truncate" style={{ maxWidth: 500 }}>
                      {exp.description}
                    </p>
                  )}
                  <p className="text-muted text-xs mt-2">Created {formatDate(exp.created_at)}</p>
                </div>
                <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
                  <button
                    className="btn btn-danger btn-sm btn-icon"
                    onClick={(e) => handleDelete(e, exp.id)}
                    title="Delete experiment"
                  >
                    <Trash2 size={14} />
                  </button>
                  <ArrowRight size={18} color="var(--text-muted)" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewExperimentModal
          title="New Experiment"
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
        />
      )}
    </>
  );
}
