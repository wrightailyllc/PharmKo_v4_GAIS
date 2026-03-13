import React from 'react';
import type { PharmKoKPIs } from '../../types';
import { ScoreCard } from './ScoreCard';
import { ConfidenceGauge } from './ConfidenceGauge';
import { TrendBadge } from './TrendBadge';

interface KPIDashboardProps {
  kpis: PharmKoKPIs;
  drugName: string;
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({ kpis, drugName }) => {
  const { harmScore, confidenceScore, safetyTrend } = kpis;

  // Determine harm score color
  let harmColor: 'green' | 'yellow' | 'red' = 'green';
  if (harmScore.score > 4) harmColor = 'yellow';
  if (harmScore.score > 7) harmColor = 'red';

  return (
    <div className="mt-6 mb-2">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-lg font-semibold text-white">PharmKo Intelligence Dashboard</h3>
        <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-400 border border-indigo-700/50">
          Proprietary KPIs
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Harm Score Card */}
        <ScoreCard
          label="Potential Harm Score"
          value={`${harmScore.score.toFixed(1)} / 10`}
          subtitle={harmScore.score <= 3 ? 'Low risk profile' : harmScore.score <= 7 ? 'Moderate risk - review details' : 'High risk - consult healthcare provider'}
          color={harmColor}
        />

        {/* Confidence Gauge */}
        <ConfidenceGauge confidence={confidenceScore} />

        {/* Safety Trend */}
        <TrendBadge trend={safetyTrend} />
      </div>

      {/* Data source status bar */}
      <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
        <span>Data sources: {confidenceScore.dataCompleteness / 25}/4 available</span>
        <span className="text-gray-700">|</span>
        <span>Analysis confidence: {confidenceScore.level}</span>
        <span className="text-gray-700">|</span>
        <span>Trend: {safetyTrend.direction}</span>
      </div>
    </div>
  );
};
