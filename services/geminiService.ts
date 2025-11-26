// services/geminiService.ts (frontend)
// This runs in the browser and ONLY talks to the backend API.

import type { AnalysisResult, SourceData } from "../types";

interface BackendResponse {
  analysisResult: AnalysisResult;
  sourceData: SourceData;
  logs?: string[];
}

export const analyzeDrugSafety = async (
  drugName: string,
  updateLog: (message: string) => void
): Promise<{ analysisResult: AnalysisResult; sourceData: SourceData }> => {
  updateLog(`Starting analysis for ${drugName}...`);

  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ drugName }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error: ${res.status} ${text}`);
  }

  const body: BackendResponse = await res.json();
  body.logs?.forEach((msg) => updateLog(msg));

  return {
    analysisResult: body.analysisResult,
    sourceData: body.sourceData,
  };
};
