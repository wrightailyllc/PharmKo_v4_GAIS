import React from 'react';
import type { SafetyTrendIndicator } from '../../types';

interface TrendBadgeProps {
  trend: SafetyTrendIndicator;
}

const trendConfig = {
  improving: {
    label: 'Improving',
    bg: 'bg-green-900/30 border-green-500/50',
    text: 'text-green-400',
    arrow: 'M5 10l7-7m0 0l7 7m-7-7v18',
  },
  stable: {
    label: 'Stable',
    bg: 'bg-blue-900/30 border-blue-500/50',
    text: 'text-blue-400',
    arrow: 'M4 12h16',
  },
  worsening: {
    label: 'Worsening',
    bg: 'bg-red-900/30 border-red-500/50',
    text: 'text-red-400',
    arrow: 'M19 14l-7 7m0 0l-7-7m7 7V3',
  },
  unknown: {
    label: 'Insufficient Data',
    bg: 'bg-gray-800 border-gray-600',
    text: 'text-gray-400',
    arrow: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01',
  },
};

export const TrendBadge: React.FC<TrendBadgeProps> = ({ trend }) => {
  const config = trendConfig[trend.direction];

  return (
    <div className={`rounded-lg border p-4 ${config.bg}`}>
      <h3 className="text-sm font-medium text-gray-400 mb-3">Safety Trend</h3>
      <div className="flex items-center gap-3 mb-2">
        <div className={`flex-shrink-0 ${config.text}`}>
          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={config.arrow} />
          </svg>
        </div>
        <span className={`text-lg font-bold ${config.text}`}>{config.label}</span>
      </div>
      <p className="text-xs text-gray-500">{trend.description}</p>

      <div className="flex gap-3 mt-3">
        {trend.newWarningsAdded && (
          <span className="text-xs px-2 py-0.5 rounded bg-red-900/40 text-red-400 border border-red-700/50">
            Black Box Warning
          </span>
        )}
        {trend.clinicalTrialActivity !== 'none' && (
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/40 text-indigo-400 border border-indigo-700/50">
            Trials: {trend.clinicalTrialActivity}
          </span>
        )}
      </div>
    </div>
  );
};
