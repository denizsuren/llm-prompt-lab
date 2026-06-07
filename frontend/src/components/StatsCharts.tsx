import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import type { ExperimentStats } from '../types';

const COLORS = ['#7c6af7', '#3ecf8e', '#f5a623', '#ff5470', '#64b5f6'];

interface Props {
  stats: ExperimentStats;
}

export default function StatsCharts({ stats }: Props) {
  const { variants } = stats;

  if (variants.length === 0) {
    return (
      <p className="text-muted text-sm" style={{ textAlign: 'center', padding: '24px' }}>
        No variants to chart.
      </p>
    );
  }

  // Data for bar chart (latency + tokens)
  const barData = variants.map((v) => ({
    name: v.label,
    'Avg Latency (ms)': v.avg_latency_ms ? Math.round(v.avg_latency_ms) : 0,
    'Avg Tokens': v.avg_tokens ? Math.round(v.avg_tokens) : 0,
  }));

  // Data for radar chart (normalise each metric 0–100)
  const maxScore = 5;
  const maxLatency = Math.max(...variants.map((v) => v.avg_latency_ms ?? 0), 1);
  const maxTokens = Math.max(...variants.map((v) => v.avg_tokens ?? 0), 1);

  const radarData = [
    {
      metric: 'Avg Score',
      ...Object.fromEntries(
        variants.map((v) => [v.label, v.avg_score ? (v.avg_score / maxScore) * 100 : 0])
      ),
    },
    {
      metric: 'Speed (inv.)',
      ...Object.fromEntries(
        variants.map((v) => [v.label, v.avg_latency_ms ? (1 - v.avg_latency_ms / maxLatency) * 100 : 0])
      ),
    },
    {
      metric: 'Conciseness',
      ...Object.fromEntries(
        variants.map((v) => [v.label, v.avg_tokens ? (1 - v.avg_tokens / maxTokens) * 100 : 0])
      ),
    },
    {
      metric: 'Run Count',
      ...Object.fromEntries(
        variants.map((v) => [v.label, Math.min(v.run_count * 10, 100)])
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h4 style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
          Latency &amp; Token Usage by Variant
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
            <Bar dataKey="Avg Latency (ms)" fill="#7c6af7" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Avg Tokens" fill="#3ecf8e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h4 style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>
          Multi-Axis Performance Radar
        </h4>
        <ResponsiveContainer width="100%" height={260}>
          <RadarChart data={radarData} outerRadius="70%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
            {variants.map((v, i) => (
              <Radar
                key={v.variant_id}
                name={v.label}
                dataKey={v.label}
                stroke={COLORS[i % COLORS.length]}
                fill={COLORS[i % COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2}
              />
            ))}
            <Tooltip
              contentStyle={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
