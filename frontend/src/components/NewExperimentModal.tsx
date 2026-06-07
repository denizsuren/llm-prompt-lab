import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  onClose: () => void;
  onSubmit: (name: string, description: string) => Promise<void>;
}

export default function NewExperimentModal({ title, onClose, onSubmit }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(name.trim(), description.trim());
      onClose();
    } catch {
      setError('Failed to create experiment. Check backend connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={handleSubmit}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="exp-name">Name *</label>
            <input
              id="exp-name"
              type="text"
              placeholder="e.g. Customer Support Tone A/B"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="exp-desc">Description</label>
            <textarea
              id="exp-desc"
              placeholder="What are you testing in this experiment?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            Create Experiment
          </button>
        </div>
      </form>
    </div>
  );
}
