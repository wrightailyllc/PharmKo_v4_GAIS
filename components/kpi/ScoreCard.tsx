import React from 'react';

interface ScoreCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color: 'green' | 'yellow' | 'red' | 'indigo' | 'gray';
  icon?: React.ReactNode;
}

const colorMap = {
  green: 'border-green-500/50 bg-green-900/20',
  yellow: 'border-yellow-500/50 bg-yellow-900/20',
  red: 'border-red-500/50 bg-red-900/20',
  indigo: 'border-indigo-500/50 bg-indigo-900/20',
  gray: 'border-gray-600 bg-gray-800/50',
};

const valueColorMap = {
  green: 'text-green-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  indigo: 'text-indigo-400',
  gray: 'text-gray-300',
};

export const ScoreCard: React.FC<ScoreCardProps> = ({ label, value, subtitle, color, icon }) => {
  return (
    <div className={`rounded-lg border p-4 ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-400">{label}</span>
        {icon && <div className="text-gray-500 h-5 w-5">{icon}</div>}
      </div>
      <div className={`text-3xl font-bold ${valueColorMap[color]}`}>
        {value}
      </div>
      {subtitle && (
        <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
};
