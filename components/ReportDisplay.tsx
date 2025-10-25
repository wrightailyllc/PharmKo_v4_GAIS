import React from 'react';
import type { AnalysisResult } from '../types';
import { ReportSection } from './ReportSection';
import { PillIcon } from './icons/PillIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
// FIX: Import the missing DocumentTextIcon component.
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { PieChart } from './PieChart';
import ReactMarkdown from 'react-markdown';

interface ReportDisplayProps {
  result: AnalysisResult;
  drugName: string;
}

const PIE_CHART_COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#f97316', '#eab308', '#10b981', '#6b7280'];

const HarmScoreBar: React.FC<{ score: number }> = ({ score }) => {
    const percentage = score * 10;
    let barColor = 'bg-green-500';
    if (score > 4) barColor = 'bg-yellow-500';
    if (score > 7) barColor = 'bg-red-500';

    return (
        <div>
            <div className="flex justify-between text-sm font-medium text-gray-400 mb-1">
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-4">
                <div className={`h-4 rounded-full ${barColor}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};


export const ReportDisplay: React.FC<ReportDisplayProps> = ({ result, drugName }) => {

  const chartData = result.adverseEffectsProfile.pieChartData.map((item, index) => ({
    name: item.name,
    value: item.value,
    color: PIE_CHART_COLORS[index % PIE_CHART_COLORS.length],
  }));

  return (
    <div className="mt-8 space-y-6">
      <header>
        <h2 className="text-3xl font-bold text-white">
          AI-Powered Safety Report for <span className="text-indigo-400">{drugName}</span>
        </h2>
        <p className="mt-2 text-gray-400">
          This report is AI-generated and for informational purposes only. It is not a substitute for professional medical advice.
        </p>
      </header>

      {/* Drug Label Analysis */}
      <ReportSection title="Drug Label Analysis" icon={<PillIcon />}>
          <ReactMarkdown>{result.drugLabelAnalysis.summary}</ReactMarkdown>
          {result.drugLabelAnalysis.blackBoxWarning && result.drugLabelAnalysis.blackBoxWarning.toLowerCase() !== 'none' && (
              <div className="mt-4 p-3 bg-black/30 border border-yellow-500 rounded-md">
                  <h4 className="font-bold text-yellow-400">Black Box Warning:</h4>
                  <p className="text-yellow-300">{result.drugLabelAnalysis.blackBoxWarning}</p>
              </div>
          )}
           <div className="mt-4">
              <h4 className="font-semibold text-white">Active Ingredient:</h4>
              <p>{result.drugLabelAnalysis.activeIngredient}</p>
          </div>
          <div className="mt-4">
              <h4 className="font-semibold text-white">Other Drugs with this Ingredient:</h4>
              <p>{result.drugLabelAnalysis.otherDrugsWithActiveIngredient.join(', ')}</p>
          </div>
      </ReportSection>

      {/* Clinical Trial Analysis */}
      <ReportSection title="Clinical Trial Analysis" icon={<ClipboardDocumentListIcon />}>
          <ReactMarkdown>{result.clinicalTrialAnalysis.summary}</ReactMarkdown>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <h4 className="font-semibold text-white">Highest Trial Phase Reached:</h4>
                  <p>{result.clinicalTrialAnalysis.highestPhase}</p>
              </div>
              <div>
                  <h4 className="font-semibold text-white">Primary Conditions Studied:</h4>
                  <p>{result.clinicalTrialAnalysis.conditionsStudied.join(', ')}</p>
              </div>
          </div>
      </ReportSection>
      
      {/* Adverse Effects Profile */}
      <ReportSection title="Adverse Effects Profile" icon={<ExclamationTriangleIcon />}>
          <ReactMarkdown>{result.adverseEffectsProfile.summary}</ReactMarkdown>
          <div className="mt-4 text-center p-3 bg-gray-900/50 rounded-md border border-gray-700">
              <p className="text-gray-400 text-sm">Total Reported Events</p>
              <p className="text-3xl font-bold text-white">{result.adverseEffectsProfile.totalEvents.toLocaleString()}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                  <h4 className="font-semibold text-white mb-2">Adverse Event Distribution</h4>
                  <PieChart data={chartData} />
              </div>
              <div>
                  <h4 className="font-semibold text-white mb-2">Top 5 Most Reported Events:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                      {result.adverseEffectsProfile.top5Events.map((event, index) => <li key={index}>{event}</li>)}
                  </ul>
              </div>
          </div>
      </ReportSection>

      {/* Journal Article Analysis */}
      <ReportSection title="Journal Article Analysis" icon={<BeakerIcon />}>
          <ReactMarkdown>{result.journalAnalysis.summary}</ReactMarkdown>
          <div className="mt-4">
              <h4 className="font-semibold text-white mb-2">Key Findings:</h4>
              <ul className="list-disc pl-5 space-y-1">
                  {result.journalAnalysis.keyFindings.map((finding, index) => <li key={index}>{finding}</li>)}
              </ul>
          </div>
          <div className="mt-4 text-sm text-gray-400 flex justify-between">
              <span>Articles Reviewed: {result.journalAnalysis.articlesReviewed}</span>
              <span>Potentially Paywalled: {result.journalAnalysis.paywalledArticles}</span>
          </div>
          <div className="mt-4 p-3 bg-indigo-900/40 border border-indigo-700 rounded-md flex items-center gap-4">
              <LockClosedIcon className="h-6 w-6 text-indigo-400 flex-shrink-0"/>
              <div>
                  <h4 className="font-bold text-indigo-300">Unlock Deeper Insights</h4>
                  <p className="text-sm text-indigo-400">Subscribe for $0.99/month to get a full analysis of paywalled articles.</p>
              </div>
          </div>
      </ReportSection>

       {/* Drug Interactions */}
      <ReportSection title="Potential Drug Interactions" icon={<ExclamationTriangleIcon />}>
          <ReactMarkdown>{result.drugInteractions.summary}</ReactMarkdown>
           <ul className="mt-4 space-y-2">
              {result.drugInteractions.interactions.map((item, index) => (
                  <li key={index} className="p-2 bg-gray-900/50 rounded-md">
                      <strong>{item.substance}:</strong> {item.effect} <span className="text-sm font-semibold text-orange-400">({item.severity})</span>
                  </li>
              ))}
           </ul>
      </ReportSection>
      
      {/* Potential Harm Score */}
      <ReportSection title="Potential Harm Score" icon={<LightBulbIcon />}>
          <ReactMarkdown>{result.potentialHarmScore.summary}</ReactMarkdown>
          <div className="mt-4">
              <HarmScoreBar score={result.potentialHarmScore.score} />
          </div>
          <div className="mt-6 p-3 bg-indigo-900/40 border border-indigo-700 rounded-md flex items-center gap-4">
              <LockClosedIcon className="h-6 w-6 text-indigo-400 flex-shrink-0"/>
              <div>
                  <h4 className="font-bold text-indigo-300">Get a Personalized Harm Analysis</h4>
                  <p className="text-sm text-indigo-400">Upload your health data for a personalized risk assessment. Subscribe for $0.99/month.</p>
              </div>
          </div>
      </ReportSection>

      {/* Citations */}
      <ReportSection title="Citations" icon={<DocumentTextIcon />}>
          <ul className="text-sm space-y-2">
              {result.citations.map((cite, index) => (
                  <li key={index}><strong>{cite.source}:</strong> {cite.details}</li>
              ))}
          </ul>
      </ReportSection>
      
      {/* Disclaimer */}
      <ReportSection title="Disclaimer" icon={<ShieldExclamationIcon />}>
          <p className="text-sm text-gray-400">
              This report is for informational purposes only and does not constitute medical or legal advice. Consult with qualified professionals.
          </p>
          <a
              href="https://www.privacypolicygenerator.info/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-400 hover:underline mt-2 inline-block"
          >
              View Full Terms of Service & Privacy Policy
          </a>
      </ReportSection>
    </div>
  );
};