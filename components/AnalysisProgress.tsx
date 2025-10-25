
import React from 'react';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { HourglassIcon } from './icons/HourglassIcon';

interface AnalysisProgressProps {
  log: string[];
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({ log }) => {
  return (
    <div className="mt-8 p-6 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <h3 className="text-lg font-semibold text-white mb-4">Analysis in Progress...</h3>
      <ul className="space-y-3">
        {log.map((entry, index) => {
          const isLast = index === log.length - 1;
          return (
            <li key={index} className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {isLast ? (
                  <HourglassIcon className="h-5 w-5 text-amber-400 animate-spin" />
                ) : (
                  <CheckCircleIcon className="h-5 w-5 text-green-400" />
                )}
              </div>
              <span className={`text-sm ${isLast ? 'text-amber-300' : 'text-gray-400'}`}>
                {entry}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
