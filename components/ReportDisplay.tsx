import React from 'react';
import { Link } from 'react-router-dom';
import type { AnalysisResult } from '../types';
import { ReportSection } from './ReportSection';
import { PillIcon } from './icons/PillIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { LightBulbIcon } from './icons/LightBulbIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
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
            <div className="text-center mt-2">
                <span className="text-2xl font-bold text-white">{score.toFixed(1)}</span>
                <span className="text-gray-400 ml-1">/ 10</span>
            </div>
        </div>
    );
};

interface ScoreBreakdownItemProps {
    label: string;
    score: number;
    weight: number;
    contribution: number;
    details: string;
}

const ScoreBreakdownItem: React.FC<ScoreBreakdownItemProps> = ({ label, score, weight, contribution, details }) => {
    let barColor = 'bg-green-500';
    if (score > 4) barColor = 'bg-yellow-500';
    if (score > 7) barColor = 'bg-red-500';
    
    return (
        <div className="p-3 bg-gray-900/50 rounded-md border border-gray-700">
            <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-white">{label}</span>
                <span className="text-sm text-gray-400">{(weight * 100).toFixed(0)}% weight</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full ${barColor}`} style={{ width: `${score * 10}%` }}></div>
            </div>
            <div className="flex justify-between text-sm">
                <span className="text-gray-400">{details}</span>
                <span className="font-medium text-white">Score: {score}/10 (+{contribution.toFixed(2)})</span>
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
      </header>

      <div role="alert" aria-label="Medical disclaimer" className="p-4 bg-amber-900/30 border-l-4 border-amber-500 rounded-md">
        <div className="flex items-start gap-3">
          <ShieldExclamationIcon className="h-6 w-6 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-200">Not medical advice.</p>
            <p className="text-amber-100/90 mt-1">
              This AI-generated report is for educational and informational purposes only. It is <strong>not</strong> a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before starting, stopping, or changing any medication. In an emergency, call 911 or your local emergency services.
            </p>
          </div>
        </div>
      </div>

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
          
          {result.potentialHarmScore.scoreBreakdown && (
            <div className="mt-6">
              <h4 className="font-semibold text-white mb-3">Score Breakdown by Category</h4>
              <div className="space-y-3">
                <ScoreBreakdownItem 
                  label="Adverse Events Volume (25%)"
                  {...result.potentialHarmScore.scoreBreakdown.adverseEventsVolume}
                />
                <ScoreBreakdownItem 
                  label="Severity of Events (20%)"
                  {...result.potentialHarmScore.scoreBreakdown.severityOfEvents}
                />
                <ScoreBreakdownItem 
                  label="Clinical Trial Support (15%)"
                  {...result.potentialHarmScore.scoreBreakdown.clinicalTrialSupport}
                />
                <ScoreBreakdownItem 
                  label="Journal Article Signals (25%)"
                  {...result.potentialHarmScore.scoreBreakdown.journalArticleSignals}
                />
                <ScoreBreakdownItem 
                  label="Label Warnings (10%)"
                  {...result.potentialHarmScore.scoreBreakdown.labelWarnings}
                />
                <ScoreBreakdownItem 
                  label="Drug Interactions (5%)"
                  {...result.potentialHarmScore.scoreBreakdown.interactions}
                />
              </div>
            </div>
          )}
          
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
          <Link
              to="/privacy"
              className="text-sm text-indigo-400 hover:underline mt-2 inline-block"
          >
              View Full Privacy Policy
          </Link>
          {' | '}
          <Link
              to="/terms"
              className="text-sm text-indigo-400 hover:underline mt-2 inline-block"
          >
              Terms of Service
          </Link>
      </ReportSection>
    </div>
  );
};