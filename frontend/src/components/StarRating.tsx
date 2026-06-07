import { useState } from 'react';

interface Props {
  runId: number;
  currentScore: number | null;
  onScore: (runId: number, score: number) => Promise<void>;
}

export default function StarRating({ runId, currentScore, onScore }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const display = hovered ?? currentScore ?? 0;

  const handleClick = async (score: number) => {
    if (loading) return;
    setLoading(true);
    try {
      await onScore(runId, score);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="stars" style={{ opacity: loading ? 0.5 : 1 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={`star ${display >= n ? 'filled' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => handleClick(n)}
          title={`Rate ${n}/5`}
        >
          ★
        </span>
      ))}
    </div>
  );
}
