import React from 'react';
import { PillIcon } from '../components/icons/PillIcon';
import { BeakerIcon } from '../components/icons/BeakerIcon';
import { DocumentTextIcon } from '../components/icons/DocumentTextIcon';

interface LandingPageProps {
  onLogin: () => void;
}

const FeatureCard: React.FC<{ icon: React.ReactNode, title: string, children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
        <div className="flex items-center gap-3 mb-3">
            <div className="text-indigo-400 h-7 w-7">{icon}</div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
        </div>
        <p className="text-gray-400">{children}</p>
    </div>
);

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  return (
    <div className="text-center max-w-4xl mx-auto">
      <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
        AI-Powered Drug Safety Insights
      </h2>
      <p className="mt-4 text-lg text-gray-400">
        PharmKo leverages cutting-edge AI to analyze data from the FDA, PubMed, and other authoritative sources, providing you with a comprehensive and easy-to-understand drug safety report in seconds.
      </p>
      
      <div className="mt-8">
        <button
          onClick={onLogin}
          className="px-8 py-3 text-lg font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-lg"
        >
          Login & Get Started
        </button>
      </div>

      <div className="mt-16 grid sm:grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <FeatureCard icon={<DocumentTextIcon />} title="FDA Data Analysis">
            Synthesizes the latest drug labels, black box warnings, and adverse event reports directly from the FDA.
        </FeatureCard>
        <FeatureCard icon={<BeakerIcon />} title="Journal Synthesis">
            Reviews and summarizes key findings from thousands of scientific articles on PubMed to identify safety signals.
        </FeatureCard>
        <FeatureCard icon={<PillIcon />} title="Interaction Checker">
            Identifies and assesses the severity of potential interactions with other drugs and substances.
        </FeatureCard>
      </div>
    </div>
  );
};