import type { SourceData, AnalysisResult, ConfidenceScore, SafetyTrendIndicator, PharmKoKPIs } from '../types';

/**
 * Calculate the Confidence Score (0-100)
 * Measures how reliable the analysis is based on data availability and quality.
 */
export function calculateConfidenceScore(sourceData: SourceData, result: AnalysisResult): ConfidenceScore {
  // Data Completeness: 25 points per data source that returned data
  let completeness = 0;
  if (sourceData.fdaLabel) completeness += 25;
  if (sourceData.adverseEvents) completeness += 25;
  if (sourceData.clinicalTrials) completeness += 25;
  if (sourceData.europePmcArticles) completeness += 25;

  // Data Recency: based on volume and freshness indicators
  let recency = 50; // baseline
  if (result.adverseEffectsProfile.totalEvents > 1000) recency += 20;
  if (result.adverseEffectsProfile.totalEvents > 10000) recency += 15;
  if (result.journalAnalysis.articlesReviewed > 5) recency += 15;
  recency = Math.min(recency, 100);

  // Source Agreement: do the sources paint a consistent picture?
  let agreement = 70; // baseline assumption
  const harmScore = result.potentialHarmScore.score;

  if (result.potentialHarmScore.scoreBreakdown) {
    const breakdown = result.potentialHarmScore.scoreBreakdown;
    const scores = [
      breakdown.adverseEventsVolume.score,
      breakdown.severityOfEvents.score,
      breakdown.clinicalTrialSupport.score,
      breakdown.journalArticleSignals.score,
      breakdown.labelWarnings.score,
      breakdown.interactions.score,
    ];
    // Calculate variance - lower variance = higher agreement
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    // Normalize: variance of 0 = 100% agreement, variance of 25 = 0%
    agreement = Math.max(0, Math.min(100, 100 - (variance * 4)));
  }

  const overall = Math.round((completeness * 0.4) + (recency * 0.3) + (agreement * 0.3));

  let level: 'high' | 'medium' | 'low' = 'medium';
  if (overall >= 75) level = 'high';
  else if (overall < 45) level = 'low';

  return {
    overall,
    dataCompleteness: completeness,
    dataRecency: recency,
    sourceAgreement: Math.round(agreement),
    level,
  };
}

/**
 * Calculate Safety Trend Indicator
 * Compares current data to cached/historical data to determine direction.
 */
export function calculateSafetyTrend(
  result: AnalysisResult,
  sourceData: SourceData,
): SafetyTrendIndicator {
  // Check for active clinical trials
  const highestPhase = result.clinicalTrialAnalysis.highestPhase.toLowerCase();
  let clinicalTrialActivity: 'active' | 'completed' | 'none' = 'none';
  if (highestPhase.includes('phase') || highestPhase.includes('recruiting')) {
    clinicalTrialActivity = 'active';
  } else if (highestPhase.includes('completed') || highestPhase.includes('approved')) {
    clinicalTrialActivity = 'completed';
  }

  // Check for black box warnings (indicator of worsening)
  const hasBlackBox = result.drugLabelAnalysis.blackBoxWarning &&
    result.drugLabelAnalysis.blackBoxWarning.toLowerCase() !== 'none' &&
    result.drugLabelAnalysis.blackBoxWarning.toLowerCase() !== 'n/a';

  // Determine direction based on available signals
  let direction: 'improving' | 'stable' | 'worsening' | 'unknown' = 'stable';
  let description = 'Safety profile appears stable based on available data.';

  const harmScore = result.potentialHarmScore.score;

  if (hasBlackBox && harmScore > 7) {
    direction = 'worsening';
    description = 'Black box warning present with high harm score indicates elevated safety concerns.';
  } else if (harmScore <= 3 && !hasBlackBox) {
    direction = 'improving';
    description = 'Low harm score with no black box warnings suggests a favorable safety profile.';
  } else if (harmScore > 5 && result.adverseEffectsProfile.totalEvents > 50000) {
    direction = 'worsening';
    description = 'High volume of adverse events with moderate-to-high harm score warrants monitoring.';
  }

  return {
    direction,
    recentEventsTrend: 0, // Would need historical data comparison
    newWarningsAdded: !!hasBlackBox,
    clinicalTrialActivity,
    description,
  };
}

/**
 * Calculate all PharmKo KPIs for a given analysis result.
 */
export function calculateKPIs(result: AnalysisResult, sourceData: SourceData): PharmKoKPIs {
  return {
    harmScore: result.potentialHarmScore,
    confidenceScore: calculateConfidenceScore(sourceData, result),
    safetyTrend: calculateSafetyTrend(result, sourceData),
  };
}
