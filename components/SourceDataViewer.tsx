import React from 'react';
import type { SourceData } from '../types';
import { ReportSection } from './ReportSection';
import { ClipboardDocumentListIcon } from './icons/ClipboardDocumentListIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { LinkIcon } from './icons/LinkIcon';

interface SourceDataViewerProps {
  sourceData: SourceData;
  drugName: string;
}

const DataCard: React.FC<{ title: string; data: any }> = ({ title, data }) => (
    <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
        <h4 className="font-bold text-indigo-400 mb-2">{title}</h4>
        <pre className="text-xs whitespace-pre-wrap break-all bg-gray-900 p-2 rounded-md">
            {data ? JSON.stringify(data, null, 2) : "No data available."}
        </pre>
    </div>
);

const formatUrlName = (key: string) => {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, (str) => str.toUpperCase())
        .replace('Fda', 'FDA')
        .replace('Rx Norm', 'RxNorm');
};

export const SourceDataViewer: React.FC<SourceDataViewerProps> = ({ sourceData, drugName }) => {
  return (
    <div className="mt-8 space-y-6">
       <header>
        <h2 className="text-3xl font-bold text-white">
          Source Data for <span className="text-indigo-400">{drugName}</span> Analysis
        </h2>
        <p className="mt-2 text-gray-400">
          This section contains the raw data and API queries used by the AI to generate the analysis report.
        </p>
      </header>

      {sourceData.apiUrls && (
        <ReportSection title="API Query URLs" icon={<LinkIcon />}>
            <p className="text-sm text-gray-400 mb-4">
                These are the exact URLs used to fetch the data for this analysis. You can click on them to view the raw API response directly from the source. This is the best way to verify the data.
            </p>
            <div className="space-y-3">
                {Object.entries(sourceData.apiUrls).map(([name, url]) => (
                    <div key={name}>
                        <h5 className="font-semibold text-gray-300">{formatUrlName(name)}</h5>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 break-all hover:underline">
                            {url}
                        </a>
                    </div>
                ))}
            </div>
        </ReportSection>
      )}

      <ReportSection title="Drug Identification (RxNorm)" icon={<ClipboardDocumentListIcon />}>
        <div className="space-y-4">
            <DataCard title="Active Ingredient" data={{ activeIngredient: sourceData.activeIngredient }}/>
            <DataCard title="RxCUI" data={{ rxcui: sourceData.rxcui }} />
        </div>
      </ReportSection>

      <ReportSection title="FDA Data" icon={<BeakerIcon />}>
        <div className="space-y-4">
            <DataCard title="Drug Label Snippet" data={sourceData.fdaLabel?.results?.[0]} />
            <DataCard title="Adverse Events (Top 50)" data={sourceData.adverseEvents?.results} />
        </div>
      </ReportSection>

       <ReportSection title="ClinicalTrials.gov Data" icon={<DocumentTextIcon />}>
         <DataCard title="Trial Snippets" data={sourceData.clinicalTrials?.studies?.slice(0, 10)} />
      </ReportSection>

      <ReportSection title="Europe PMC Articles" icon={<BookmarkIcon />}>
        <DataCard title="API Response Snippet" data={sourceData.europePmcArticles} />
      </ReportSection>
    </div>
  );
};