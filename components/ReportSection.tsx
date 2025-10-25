
import React from 'react';

interface ReportSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const ReportSection: React.FC<ReportSectionProps> = ({ title, icon, children }) => {
  return (
    <section className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 transition-all hover:border-indigo-500/50 hover:shadow-indigo-500/10">
      <div className="flex items-center gap-3 mb-4 border-b border-gray-700 pb-3">
        <div className="text-indigo-400 h-6 w-6">{icon}</div>
        <h3 className="text-xl font-bold text-white">{title}</h3>
      </div>
      <div className="prose prose-invert max-w-none prose-p:text-gray-300 prose-ul:text-gray-300">
        {children}
      </div>
    </section>
  );
};
