// Scoring utility functions for performance reviews
// Ported from hr-performance-app/src/utils/scoring.js

import { Goal, CompetencyScore } from '@prisma/client';

/**
 * Goal with score for calculation
 */
interface GoalWithScore {
  title: string;
  weight: number;
  scoreMidYear?: number | null;
  scoreEndYear?: number | null;
}

/**
 * Calculate WHAT-axis score (weighted average of goals)
 * @param goals - Array of goal objects with score and weight
 * @param stage - 'midYear' or 'endYear' to determine which score to use
 * @returns Weighted average score (1.00 - 3.00) or null if incomplete
 */
export function calculateWhatScore(
  goals: GoalWithScore[],
  stage: 'midYear' | 'endYear'
): number | null {
  const scoreField = stage === 'midYear' ? 'scoreMidYear' : 'scoreEndYear';

  const validGoals = goals.filter(g => {
    const score = g[scoreField];
    return g.title?.trim() && score !== null && score !== undefined && g.weight > 0;
  });

  if (validGoals.length === 0) return null;

  const totalWeight = validGoals.reduce((sum, g) => sum + Number(g.weight), 0);

  if (totalWeight === 0) return null;

  const weightedSum = validGoals.reduce((sum, g) => {
    const score = g[scoreField] as number;
    return sum + (score * Number(g.weight));
  }, 0);

  // Return score normalized to 100% weight base
  return weightedSum / totalWeight;
}

/**
 * Calculate HOW-axis score with VETO rule
 * If any competency score = 1, HOW Score = 1.00
 * Otherwise, average of all 6 competency scores
 * @param competencyScores - Array of competency score objects
 * @param stage - 'midYear' or 'endYear'
 * @returns HOW score (1.00 - 3.00) or null if incomplete
 */
export function calculateHowScore(
  competencyScores: Array<{ scoreMidYear?: number | null; scoreEndYear?: number | null }>,
  stage: 'midYear' | 'endYear'
): number | null {
  const scoreField = stage === 'midYear' ? 'scoreMidYear' : 'scoreEndYear';

  const scores = competencyScores
    .map(cs => cs[scoreField])
    .filter((s): s is number => s !== null && s !== undefined);

  // Require all 6 competencies to be scored
  if (scores.length !== 6) return null;

  // VETO RULE: If any score is 1, HOW Score = 1.00
  if (scores.some(s => s === 1)) {
    return 1.00;
  }

  const sum = scores.reduce((acc, s) => acc + s, 0);
  return sum / 6;
}

/**
 * Map TOV-Level to grid position (for 3x3 grid)
 * A=1, B=2, C=3, D=3
 * @param level - TOV-Level code (A, B, C, D)
 * @returns Grid position (1, 2, or 3)
 */
export function mapLevelToGrid(level: string): number | null {
  const mapping: Record<string, number> = { A: 1, B: 2, C: 3, D: 3 };
  return mapping[level.toUpperCase()] ?? null;
}

/**
 * Round score to grid position
 * @param score - Score (1.00 - 3.00)
 * @returns Grid position (1, 2, or 3)
 */
export function roundToGridPosition(score: number | null): number | null {
  if (score === null || score === undefined) return null;
  return Math.round(score);
}

/**
 * Get grid cell color based on position
 * @param whatPos - WHAT position (1-3)
 * @param howPos - HOW position (1-3)
 * @returns Color code
 */
export function getGridColor(whatPos: number | null, howPos: number | null): string {
  if (!whatPos || !howPos) return '#E5E7EB'; // gray

  const colorMap: Record<string, string> = {
    '1-1': '#DC3545', // Red - Poor/Poor
    '1-2': '#FFA500', // Orange - Poor/Average
    '1-3': '#FFA500', // Orange - Poor/Good
    '2-1': '#FFA500', // Orange - Average/Poor
    '2-2': '#28A745', // Green - Average/Average
    '2-3': '#28A745', // Green - Average/Good
    '3-1': '#FFA500', // Orange - Good/Poor
    '3-2': '#28A745', // Green - Good/Average
    '3-3': '#1B5E20', // Dark Green - Good/Good
  };

  return colorMap[`${whatPos}-${howPos}`] || '#E5E7EB';
}

/**
 * Get grid label based on position
 */
export function getGridLabel(whatPos: number | null, howPos: number | null): string {
  if (!whatPos || !howPos) return '';

  const labels: Record<string, string> = {
    '1-1': 'Needs Improvement',
    '1-2': 'Development Needed',
    '1-3': 'Inconsistent Performer',
    '2-1': 'Underperformer',
    '2-2': 'Solid Performer',
    '2-3': 'High Potential',
    '3-1': 'Results Only',
    '3-2': 'Strong Performer',
    '3-3': 'Star Performer',
  };

  return labels[`${whatPos}-${howPos}`] || '';
}

/**
 * Validate weights sum to 100%
 * @param goals - Array of goal objects with weight
 * @returns True if weights sum to 100% (with 0.01 tolerance)
 */
export function validateWeights(goals: GoalWithScore[]): boolean {
  const goalsWithContent = goals.filter(g => g.title?.trim());
  if (goalsWithContent.length === 0) return true;

  const totalWeight = goalsWithContent.reduce((sum, g) => sum + (Number(g.weight) || 0), 0);
  return Math.abs(totalWeight - 100) < 0.01;
}

/**
 * Calculate total weight of goals
 * @param goals - Array of goal objects with weight
 * @returns Total weight
 */
export function calculateTotalWeight(goals: GoalWithScore[]): number {
  return goals
    .filter(g => g.title?.trim())
    .reduce((sum, g) => sum + (Number(g.weight) || 0), 0);
}

/**
 * Validation result for a review
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate review is complete for a specific stage
 */
export function validateReviewStage(
  goals: GoalWithScore[],
  competencyScores: Array<{ scoreMidYear?: number | null; scoreEndYear?: number | null }>,
  stage: 'goalSetting' | 'midYear' | 'endYear'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Goal validation
  const goalsWithContent = goals.filter(g => g.title?.trim());

  if (goalsWithContent.length === 0) {
    errors.push('At least one goal is required');
  } else {
    // Check weights sum to 100%
    if (!validateWeights(goals)) {
      errors.push('Goal weights must sum to 100%');
    }

    // For goal setting, just need titles and weights
    if (stage === 'goalSetting') {
      const allWeighted = goalsWithContent.every(g => g.weight > 0);
      if (!allWeighted) {
        errors.push('All goals must have a weight assigned');
      }
    }

    // For reviews, need scores
    if (stage === 'midYear' || stage === 'endYear') {
      const scoreField = stage === 'midYear' ? 'scoreMidYear' : 'scoreEndYear';
      const allScored = goalsWithContent.every(g => g[scoreField] !== null && g[scoreField] !== undefined);
      if (!allScored) {
        errors.push('All goals must be scored');
      }

      // Competency validation for reviews
      const requiredScores = 6;
      const stageScoreField = stage === 'midYear' ? 'scoreMidYear' : 'scoreEndYear';
      const scoredCompetencies = competencyScores.filter(
        cs => cs[stageScoreField] !== null && cs[stageScoreField] !== undefined
      );

      if (scoredCompetencies.length < requiredScores) {
        errors.push(`All ${requiredScores} competencies must be scored`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Calculate and return all scores for a review
 */
export interface ReviewScores {
  whatScore: number | null;
  howScore: number | null;
  whatGridPosition: number | null;
  howGridPosition: number | null;
  gridColor: string;
  gridLabel: string;
}

export function calculateReviewScores(
  goals: GoalWithScore[],
  competencyScores: Array<{ scoreMidYear?: number | null; scoreEndYear?: number | null }>,
  stage: 'midYear' | 'endYear'
): ReviewScores {
  const whatScore = calculateWhatScore(goals, stage);
  const howScore = calculateHowScore(competencyScores, stage);

  const whatGridPosition = roundToGridPosition(whatScore);
  const howGridPosition = roundToGridPosition(howScore);

  return {
    whatScore,
    howScore,
    whatGridPosition,
    howGridPosition,
    gridColor: getGridColor(whatGridPosition, howGridPosition),
    gridLabel: getGridLabel(whatGridPosition, howGridPosition),
  };
}

/**
 * Format score for display (2 decimal places)
 */
export function formatScore(score: number | null): string {
  if (score === null) return '-';
  return score.toFixed(2);
}
