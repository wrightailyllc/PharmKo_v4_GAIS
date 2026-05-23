import React, { useState, useRef, useMemo } from 'react';
import { DrugInputForm } from '../components/DrugInputForm';
import { AnalysisProgress } from '../components/AnalysisProgress';
import { ReportDisplay } from '../components/ReportDisplay';
import { SourceDataViewer } from '../components/SourceDataViewer';
import { KPIDashboard } from '../components/kpi/KPIDashboard';
import { analyzeDrugSafety } from '../services/geminiService';
import { calculateKPIs } from '../utils/kpiCalculations';
import type { AnalysisResult, SourceData } from '../types';
import { BookmarkIcon } from '../components/icons/BookmarkIcon';
import { DownloadIcon } from '../components/icons/DownloadIcon';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type View = 'report' | 'sources';

export const DashboardPage: React.FC = () => {
  const [drugName, setDrugName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [analysisLog, setAnalysisLog] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [sourceData, setSourceData] = useState<SourceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('report');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const kpis = useMemo(() => {
    if (analysisResult && sourceData) {
      return calculateKPIs(analysisResult, sourceData);
    }
    return null;
  }, [analysisResult, sourceData]);

  const handleAnalyze = async (newDrugName: string) => {
    setIsLoading(true);
    setDrugName(newDrugName);
    setAnalysisResult(null);
    setSourceData(null);
    setError(null);
    setAnalysisLog([]);
    setCurrentView('report');

    const updateLog = (message: string) => {
      setAnalysisLog(prev => [...prev, message]);
    };

    try {
      const { analysisResult: result, sourceData: srcData } = await analyzeDrugSafety(newDrugName, updateLog);
      setAnalysisResult(result);
      setSourceData(srcData);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadPdf = () => {
    if (reportRef.current) {
      const currentViewElement = reportRef.current.querySelector(`[data-view="${currentView}"]`);
      if (currentViewElement) {
        html2canvas(currentViewElement as HTMLElement, { backgroundColor: '#111827' }).then(canvas => {
          const imgData = canvas.toDataURL('image/png');
          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
          pdf.save(`PharmKo-Report-${drugName}-${currentView}.pdf`);
        });
      }
    }
  };

  const handleSaveReport = () => {
    setSaveNotice("Saving reports is a premium feature coming soon. Stay tuned!");
    setTimeout(() => setSaveNotice(null), 4000);
  };

  return (
    <>
      {saveNotice && (
        <div className="fixed top-4 right-4 z-50 bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg animate-pulse">
          {saveNotice}
        </div>
      )}
      <DrugInputForm onAnalyze={handleAnalyze} isLoading={isLoading} />
      
      {isLoading && <AnalysisProgress log={analysisLog} />}

      {error && (
        <div className="mt-8 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
          <h3 className="font-bold">Analysis Failed</h3>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {analysisResult && sourceData && !isLoading && kpis && (
        <>
          <KPIDashboard kpis={kpis} drugName={drugName} />

          <div className="flex justify-center items-center gap-4 mt-8">
              <div className="flex rounded-md shadow-sm bg-gray-800 border border-gray-700">
                  <button 
                      onClick={() => setCurrentView('report')}
                      className={`px-4 py-2 text-sm font-medium rounded-l-md transition-colors ${currentView === 'report' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                  >
                      AI Analysis Report
                  </button>
                  <button 
                      onClick={() => setCurrentView('sources')}
                      className={`px-4 py-2 text-sm font-medium rounded-r-md transition-colors ${currentView === 'sources' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-700'}`}
                  >
                      View Source Data
                  </button>
              </div>
              <div className="flex gap-2">
                  <button onClick={handleDownloadPdf} className="p-2 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors" title="Download Report" aria-label="Download report as PDF" type="button">
                      <DownloadIcon className="h-5 w-5"/>
                  </button>
                  <button onClick={handleSaveReport} className="p-2 bg-gray-800 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors" title="Save Report (Premium)" aria-label="Save report" type="button">
                      <BookmarkIcon className="h-5 w-5"/>
                  </button>
              </div>
          </div>
          
          <div ref={reportRef}>
            <div data-view="report" style={{ display: currentView === 'report' ? 'block' : 'none' }}>
              <ReportDisplay result={analysisResult} drugName={drugName} />
            </div>
            <div data-view="sources" style={{ display: currentView === 'sources' ? 'block' : 'none' }}>
              <SourceDataViewer sourceData={sourceData} drugName={drugName} />
            </div>
          </div>
        </>
      )}
    </>
  );
};
