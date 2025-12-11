/**
 * Analytics utilities for 9-grid performance analytics
 */

// Grid position configuration
export const GRID_POSITIONS = [
  { what: 1, how: 1, label: 'C1', key: '1-1' },
  { what: 1, how: 2, label: 'C2', key: '1-2' },
  { what: 1, how: 3, label: 'C3', key: '1-3' },
  { what: 2, how: 1, label: 'B1', key: '2-1' },
  { what: 2, how: 2, label: 'B2', key: '2-2' },
  { what: 2, how: 3, label: 'B3', key: '2-3' },
  { what: 3, how: 1, label: 'A1', key: '3-1' },
  { what: 3, how: 2, label: 'A2', key: '3-2' },
  { what: 3, how: 3, label: 'A3', key: '3-3' },
];

// Performance tier classification
export const PERFORMANCE_TIERS = {
  topTalent: {
    positions: ['3-3', '2-3', '3-2'],
    label: 'Top Talent',
    color: '#1B5E20',
  },
  solidPerformer: {
    positions: ['2-2', '1-3', '3-1'],
    label: 'Solid Performer',
    color: '#28A745',
  },
  needsAttention: {
    positions: ['1-2', '2-1'],
    label: 'Needs Attention',
    color: '#FFA500',
  },
  concern: {
    positions: ['1-1'],
    label: 'Concern',
    color: '#DC3545',
  },
};

// Grid cell colors
export const GRID_COLORS = {
  '1-1': '#DC3545', // Red - Concern
  '1-2': '#FFA500', // Orange
  '2-1': '#FFA500', // Orange
  '1-3': '#28A745', // Green
  '2-2': '#28A745', // Green
  '3-1': '#28A745', // Green
  '2-3': '#1B5E20', // Dark Green
  '3-2': '#1B5E20', // Dark Green
  '3-3': '#1B5E20', // Dark Green - Top Talent
};

/**
 * Get performance level for a grid position
 */
export function getPerformanceLevel(whatPos, howPos) {
  const key = `${whatPos}-${howPos}`;

  for (const [tier, config] of Object.entries(PERFORMANCE_TIERS)) {
    if (config.positions.includes(key)) {
      return config.label;
    }
  }
  return 'Unknown';
}

/**
 * Get performance tier key for a grid position
 */
export function getPerformanceTierKey(whatPos, howPos) {
  const key = `${whatPos}-${howPos}`;

  for (const [tierKey, config] of Object.entries(PERFORMANCE_TIERS)) {
    if (config.positions.includes(key)) {
      return tierKey;
    }
  }
  return null;
}

/**
 * Get grid color for a position
 */
export function getGridColor(whatPos, howPos) {
  const key = `${whatPos}-${howPos}`;
  return GRID_COLORS[key] || '#6c757d';
}

/**
 * Get grid label (A1, B2, etc.) for a position
 */
export function getGridLabel(whatPos, howPos) {
  const pos = GRID_POSITIONS.find(p => p.what === whatPos && p.how === howPos);
  return pos?.label || `${whatPos}-${howPos}`;
}

/**
 * Round score to grid position (1-3)
 */
export function roundToGridPosition(score) {
  if (score === null || score === undefined) return null;
  if (score < 1.5) return 1;
  if (score < 2.5) return 2;
  return 3;
}

/**
 * Calculate distribution percentages from grid data
 */
export function calculateDistributionPercentages(distribution, total) {
  if (!total || total === 0) return { topTalent: 0, solidPerformer: 0, needsAttention: 0, concern: 0 };

  return {
    topTalent: Math.round((distribution.topTalent / total) * 100 * 10) / 10,
    solidPerformer: Math.round((distribution.solidPerformer / total) * 100 * 10) / 10,
    needsAttention: Math.round((distribution.needsAttention / total) * 100 * 10) / 10,
    concern: Math.round((distribution.concern / total) * 100 * 10) / 10,
  };
}

/**
 * Transform trends data for Recharts
 */
export function transformTrendsForChart(trendsData) {
  if (!trendsData?.years) return [];

  return trendsData.years.map(yearData => ({
    year: yearData.year,
    topTalent: yearData.distribution.topTalent,
    solidPerformer: yearData.distribution.solidPerformer,
    needsAttention: yearData.distribution.needsAttention,
    concern: yearData.distribution.concern,
    avgWhat: yearData.avgWhatScore,
    avgHow: yearData.avgHowScore,
    total: yearData.totalScored,
  }));
}

/**
 * Calculate trend direction (up, down, stable)
 */
export function calculateTrend(current, previous) {
  if (current === null || previous === null) return 'stable';

  const diff = current - previous;
  if (diff > 0.05) return 'up';
  if (diff < -0.05) return 'down';
  return 'stable';
}

/**
 * Format percentage for display
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format score for display
 */
export function formatScore(value, decimals = 2) {
  if (value === null || value === undefined) return '-';
  return value.toFixed(decimals);
}
