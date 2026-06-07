import { useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSubmit: (
    label: string,
    userPrompt: string,
    systemPrompt: string,
  ) => Promise<void>;
}

export default function NewVariantModal({ onClose, onSubmit }: Props) {
  const [label, setLabel] = useState('');
  const [userPrompt, setUserPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) { setError('Label is required'); return; }
    if (!userPrompt.trim()) { setError('User prompt is required'); return; }
    setLoading(true);
    setError('');
    try {
      await onSubmit(label.trim(), userPrompt.trim(), systemPrompt.trim());
      onClose();
    } catch {
      setError('Failed to save variant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="modal" onSubmit={handleSubmit} style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <h3>New Prompt Variant</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}

          <div className="form-group">
            <label htmlFor="var-label">Label *</label>
            <input
              id="var-label"
              type="text"
              placeholder="e.g. Control, Variant A, With CoT"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="var-system">System Prompt</label>
            <textarea
              id="var-system"
              placeholder="You are a helpful assistant..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={2}
            />
          </div>

          <div className="form-group">
            <label htmlFor="var-user">User Prompt *</label>
            <textarea
              id="var-user"
              placeholder="Write the prompt you want to evaluate..."
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              rows={5}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <span className="spinner" /> : null}
            Add Variant
          </button>
        </div>
      </form>
    </div>
  );
}
