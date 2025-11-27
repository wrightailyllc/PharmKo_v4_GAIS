// types.ts

export interface PieChartDataItem {
  name: string;
  value: number;
}

export interface DrugLabelAnalysis {
  summary: string;
  blackBoxWarning: string;
  activeIngredient: string;
  otherDrugsWithActiveIngredient: string[];
}

export interface ClinicalTrialAnalysis {
  summary: string;
  highestPhase: string;
  conditionsStudied: string[];
}

export interface AdverseEffectsProfile {
  summary: string;
  totalEvents: number;
  pieChartData: PieChartDataItem[];
  top5Events: string[];
}

export interface JournalAnalysis {
  summary: string;
  keyFindings: string[];
  articlesReviewed: number;
  paywalledArticles: number;
}

export interface DrugInteraction {
  substance: string;
  effect: string;
  severity: string;
}

export interface DrugInteractions {
  summary: string;
  interactions: DrugInteraction[];
}

export interface ScoreComponent {
  score: number;
  weight: number;
  contribution: number;
  details: string;
}

export interface ScoreBreakdown {
  adverseEventsVolume: ScoreComponent;
  severityOfEvents: ScoreComponent;
  clinicalTrialSupport: ScoreComponent;
  journalArticleSignals: ScoreComponent;
  labelWarnings: ScoreComponent;
  interactions: ScoreComponent;
}

export interface PotentialHarmScore {
  summary: string;
  score: number;
  scoreBreakdown?: ScoreBreakdown;
}

export interface Citation {
  source: string;
  details: string;
}

export interface AnalysisResult {
  drugLabelAnalysis: DrugLabelAnalysis;
  clinicalTrialAnalysis: ClinicalTrialAnalysis;
  adverseEffectsProfile: AdverseEffectsProfile;
  journalAnalysis: JournalAnalysis;
  drugInteractions: DrugInteractions;
  potentialHarmScore: PotentialHarmScore;
  citations: Citation[];
}

export interface SourceData {
  rxcui: string;
  activeIngredient: string;
  fdaLabel?: any;
  adverseEvents?: any;
  clinicalTrials?: any;
  europePmcArticles?: any;
  apiUrls?: Record<string, string>;
}
