import React, { useState } from 'react';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface DrugInputFormProps {
  onAnalyze: (drugName: string) => void;
  isLoading: boolean;
}

export const DrugInputForm: React.FC<DrugInputFormProps> = ({ onAnalyze, isLoading }) => {
  const [drugName, setDrugName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (drugName.trim() && !isLoading) {
      onAnalyze(drugName.trim());
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-center text-white mb-4">
        AI-Powered Drug Safety Analysis
      </h2>
      <p className="text-center text-gray-400 mb-6">
        Enter a drug name to generate a safety and interaction report from the latest FDA data, medical journals, and more.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={drugName}
          onChange={(e) => setDrugName(e.target.value)}
          placeholder="e.g., Aspirin, Tylenol, Lipitor..."
          className="flex-grow bg-gray-800 border border-gray-700 text-white placeholder-gray-500 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 px-4 py-2"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !drugName.trim()}
          className="inline-flex items-center justify-center px-6 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-900/50 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <>
              <SpinnerIcon />
              Analyzing...
            </>
          ) : (
            'Analyze Drug'
          )}
        </button>
      </form>
    </div>
  );
};