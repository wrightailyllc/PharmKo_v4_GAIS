import React from 'react';
import type { ConfidenceScore } from '../../types';

interface ConfidenceGaugeProps {
  confidence: ConfidenceScore;
}

export const ConfidenceGauge: React.FC<ConfidenceGaugeProps> = ({ confidence }) => {
  const { overall, dataCompleteness, dataRecency, sourceAgreement, level } = confidence;

  // SVG donut chart
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (overall / 100) * circumference;

  const colorByLevel = {
    high: { stroke: '#10b981', text: 'text-green-400', bg: 'bg-green-900/20', label: 'High' },
    medium: { stroke: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-900/20', label: 'Medium' },
    low: { stroke: '#ef4444', text: 'text-red-400', bg: 'bg-red-900/20', label: 'Low' },
  };

  const colors = colorByLevel[level];

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-800/50 p-4">
      <h3 className="text-sm font-medium text-gray-400 mb-3">Analysis Confidence</h3>
      <div className="flex items-center gap-4">
        {/* Donut gauge */}
        <div className="relative flex-shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke="#374151"
              strokeWidth="8"
            />
            <circle
              cx="50" cy="50" r={radius}
              fill="none"
              stroke={colors.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 50 50)"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-xl font-bold ${colors.text}`}>{overall}%</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="flex-1 space-y-2">
          <div className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
            {colors.label} Confidence
          </div>
          <div className="space-y-1.5">
            <BreakdownBar label="Data Sources" value={dataCompleteness} />
            <BreakdownBar label="Data Recency" value={dataRecency} />
            <BreakdownBar label="Source Agreement" value={sourceAgreement} />
          </div>
        </div>
      </div>
    </div>
  );
};

const BreakdownBar: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  let barColor = 'bg-green-500';
  if (value < 70) barColor = 'bg-yellow-500';
  if (value < 40) barColor = 'bg-red-500';

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};
