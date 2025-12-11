import { describe, it, expect } from 'vitest';
import {
  calculateWhatScore,
  calculateHowScore,
  mapLevelToGrid,
  roundToGridPosition,
  getGridColor,
  getGridLabel,
  validateWeights,
  calculateTotalWeight,
  validateReviewStage,
  calculateReviewScores,
  formatScore,
} from './scoring.js';

describe('calculateWhatScore', () => {
  it('should return null for empty goals array', () => {
    expect(calculateWhatScore([], 'midYear')).toBeNull();
    expect(calculateWhatScore([], 'endYear')).toBeNull();
  });

  it('should return null when no goals have scores', () => {
    const goals = [
      { title: 'Goal 1', weight: 50, scoreMidYear: null, scoreEndYear: null },
      { title: 'Goal 2', weight: 50, scoreMidYear: null, scoreEndYear: null },
    ];
    expect(calculateWhatScore(goals, 'midYear')).toBeNull();
  });

  it('should calculate weighted average for midYear scores', () => {
    const goals = [
      { title: 'Goal 1', weight: 60, scoreMidYear: 3, scoreEndYear: null },
      { title: 'Goal 2', weight: 40, scoreMidYear: 2, scoreEndYear: null },
    ];
    // (3 * 60 + 2 * 40) / 100 = 260 / 100 = 2.6
    expect(calculateWhatScore(goals, 'midYear')).toBe(2.6);
  });

  it('should calculate weighted average for endYear scores', () => {
    const goals = [
      { title: 'Goal 1', weight: 50, scoreMidYear: 2, scoreEndYear: 3 },
      { title: 'Goal 2', weight: 50, scoreMidYear: 2, scoreEndYear: 1 },
    ];
    // (3 * 50 + 1 * 50) / 100 = 200 / 100 = 2.0
    expect(calculateWhatScore(goals, 'endYear')).toBe(2);
  });

  it('should normalize to total weight when weights do not sum to 100', () => {
    const goals = [
      { title: 'Goal 1', weight: 30, scoreMidYear: 3, scoreEndYear: null },
      { title: 'Goal 2', weight: 20, scoreMidYear: 2, scoreEndYear: null },
    ];
    // (3 * 30 + 2 * 20) / 50 = 130 / 50 = 2.6
    expect(calculateWhatScore(goals, 'midYear')).toBe(2.6);
  });

  it('should ignore goals without titles', () => {
    const goals = [
      { title: 'Goal 1', weight: 100, scoreMidYear: 3, scoreEndYear: null },
      { title: '', weight: 100, scoreMidYear: 1, scoreEndYear: null },
      { title: '   ', weight: 100, scoreMidYear: 1, scoreEndYear: null },
    ];
    expect(calculateWhatScore(goals, 'midYear')).toBe(3);
  });

  it('should return perfect score when all goals are 3', () => {
    const goals = [
      { title: 'Goal 1', weight: 25, scoreMidYear: 3, scoreEndYear: null },
      { title: 'Goal 2', weight: 25, scoreMidYear: 3, scoreEndYear: null },
      { title: 'Goal 3', weight: 25, scoreMidYear: 3, scoreEndYear: null },
      { title: 'Goal 4', weight: 25, scoreMidYear: 3, scoreEndYear: null },
    ];
    expect(calculateWhatScore(goals, 'midYear')).toBe(3);
  });

  it('should return minimum score when all goals are 1', () => {
    const goals = [
      { title: 'Goal 1', weight: 50, scoreMidYear: 1, scoreEndYear: null },
      { title: 'Goal 2', weight: 50, scoreMidYear: 1, scoreEndYear: null },
    ];
    expect(calculateWhatScore(goals, 'midYear')).toBe(1);
  });
});

describe('calculateHowScore', () => {
  it('should return null when fewer than 6 competencies scored', () => {
    const scores = [
      { scoreMidYear: 2, scoreEndYear: null },
      { scoreMidYear: 2, scoreEndYear: null },
      { scoreMidYear: 2, scoreEndYear: null },
    ];
    expect(calculateHowScore(scores, 'midYear')).toBeNull();
  });

  it('should apply VETO rule when any score is 1', () => {
    const scores = [
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 1, scoreEndYear: null }, // VETO
    ];
    expect(calculateHowScore(scores, 'midYear')).toBe(1);
  });

  it('should calculate average when no VETO applies', () => {
    const scores = [
      { scoreMidYear: 2, scoreEndYear: null },
      { scoreMidYear: 2, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 2, scoreEndYear: null },
      { scoreMidYear: 2, scoreEndYear: null },
    ];
    // (2+2+3+3+2+2) / 6 = 14 / 6 = 2.333...
    expect(calculateHowScore(scores, 'midYear')).toBeCloseTo(2.333, 2);
  });

  it('should return 3 when all scores are 3', () => {
    const scores = Array(6).fill({ scoreMidYear: 3, scoreEndYear: null });
    expect(calculateHowScore(scores, 'midYear')).toBe(3);
  });

  it('should use endYear scores when specified', () => {
    const scores = [
      { scoreMidYear: 1, scoreEndYear: 2 },
      { scoreMidYear: 1, scoreEndYear: 2 },
      { scoreMidYear: 1, scoreEndYear: 2 },
      { scoreMidYear: 1, scoreEndYear: 2 },
      { scoreMidYear: 1, scoreEndYear: 2 },
      { scoreMidYear: 1, scoreEndYear: 2 },
    ];
    // midYear would be 1 (VETO), endYear should be 2
    expect(calculateHowScore(scores, 'endYear')).toBe(2);
    expect(calculateHowScore(scores, 'midYear')).toBe(1);
  });
});

describe('mapLevelToGrid', () => {
  it('should map TOV levels correctly', () => {
    expect(mapLevelToGrid('A')).toBe(1);
    expect(mapLevelToGrid('B')).toBe(2);
    expect(mapLevelToGrid('C')).toBe(3);
    expect(mapLevelToGrid('D')).toBe(3); // D maps to same as C
  });

  it('should handle lowercase levels', () => {
    expect(mapLevelToGrid('a')).toBe(1);
    expect(mapLevelToGrid('b')).toBe(2);
    expect(mapLevelToGrid('c')).toBe(3);
    expect(mapLevelToGrid('d')).toBe(3);
  });

  it('should return null for invalid levels', () => {
    expect(mapLevelToGrid('E')).toBeNull();
    expect(mapLevelToGrid('X')).toBeNull();
    expect(mapLevelToGrid('')).toBeNull();
  });
});

describe('roundToGridPosition', () => {
  it('should round scores to nearest integer', () => {
    expect(roundToGridPosition(1.4)).toBe(1);
    expect(roundToGridPosition(1.5)).toBe(2);
    expect(roundToGridPosition(2.4)).toBe(2);
    expect(roundToGridPosition(2.5)).toBe(3);
    expect(roundToGridPosition(2.9)).toBe(3);
  });

  it('should return null for null input', () => {
    expect(roundToGridPosition(null)).toBeNull();
  });
});

describe('getGridColor', () => {
  it('should return red for poor/poor (1,1)', () => {
    expect(getGridColor(1, 1)).toBe('#DC3545');
  });

  it('should return orange for development areas', () => {
    expect(getGridColor(1, 2)).toBe('#FFA500');
    expect(getGridColor(1, 3)).toBe('#FFA500');
    expect(getGridColor(2, 1)).toBe('#FFA500');
    expect(getGridColor(3, 1)).toBe('#FFA500');
  });

  it('should return green for solid performers', () => {
    expect(getGridColor(2, 2)).toBe('#28A745');
    expect(getGridColor(2, 3)).toBe('#28A745');
    expect(getGridColor(3, 2)).toBe('#28A745');
  });

  it('should return dark green for star performer (3,3)', () => {
    expect(getGridColor(3, 3)).toBe('#1B5E20');
  });

  it('should return gray for null positions', () => {
    expect(getGridColor(null, 2)).toBe('#E5E7EB');
    expect(getGridColor(2, null)).toBe('#E5E7EB');
    expect(getGridColor(null, null)).toBe('#E5E7EB');
  });
});

describe('getGridLabel', () => {
  it('should return correct labels for all positions', () => {
    expect(getGridLabel(1, 1)).toBe('Needs Improvement');
    expect(getGridLabel(2, 2)).toBe('Solid Performer');
    expect(getGridLabel(3, 3)).toBe('Star Performer');
    expect(getGridLabel(3, 1)).toBe('Results Only');
    expect(getGridLabel(1, 3)).toBe('Inconsistent Performer');
  });

  it('should return empty string for null positions', () => {
    expect(getGridLabel(null, 2)).toBe('');
    expect(getGridLabel(2, null)).toBe('');
  });
});

describe('validateWeights', () => {
  it('should return true when weights sum to 100', () => {
    const goals = [
      { title: 'Goal 1', weight: 60, scoreMidYear: null, scoreEndYear: null },
      { title: 'Goal 2', weight: 40, scoreMidYear: null, scoreEndYear: null },
    ];
    expect(validateWeights(goals)).toBe(true);
  });

  it('should return false when weights do not sum to 100', () => {
    const goals = [
      { title: 'Goal 1', weight: 50, scoreMidYear: null, scoreEndYear: null },
      { title: 'Goal 2', weight: 40, scoreMidYear: null, scoreEndYear: null },
    ];
    expect(validateWeights(goals)).toBe(false);
  });

  it('should return true for empty goals', () => {
    expect(validateWeights([])).toBe(true);
  });

  it('should ignore goals without titles', () => {
    const goals = [
      { title: 'Goal 1', weight: 100, scoreMidYear: null, scoreEndYear: null },
      { title: '', weight: 50, scoreMidYear: null, scoreEndYear: null },
    ];
    expect(validateWeights(goals)).toBe(true);
  });

  it('should handle floating point tolerance', () => {
    const goals = [
      { title: 'Goal 1', weight: 33.33, scoreMidYear: null, scoreEndYear: null },
      { title: 'Goal 2', weight: 33.33, scoreMidYear: null, scoreEndYear: null },
      { title: 'Goal 3', weight: 33.34, scoreMidYear: null, scoreEndYear: null },
    ];
    expect(validateWeights(goals)).toBe(true);
  });
});

describe('calculateTotalWeight', () => {
  it('should sum weights of goals with titles', () => {
    const goals = [
      { title: 'Goal 1', weight: 30, scoreMidYear: null, scoreEndYear: null },
      { title: 'Goal 2', weight: 40, scoreMidYear: null, scoreEndYear: null },
      { title: '', weight: 50, scoreMidYear: null, scoreEndYear: null }, // ignored
    ];
    expect(calculateTotalWeight(goals)).toBe(70);
  });

  it('should return 0 for empty array', () => {
    expect(calculateTotalWeight([])).toBe(0);
  });
});

describe('validateReviewStage', () => {
  const sixCompetencies = [
    { scoreMidYear: 2, scoreEndYear: 2 },
    { scoreMidYear: 2, scoreEndYear: 2 },
    { scoreMidYear: 2, scoreEndYear: 2 },
    { scoreMidYear: 2, scoreEndYear: 2 },
    { scoreMidYear: 2, scoreEndYear: 2 },
    { scoreMidYear: 2, scoreEndYear: 2 },
  ];

  describe('goalSetting stage', () => {
    it('should require at least one goal', () => {
      const result = validateReviewStage([], [], 'goalSetting');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one goal is required');
    });

    it('should require weights to sum to 100%', () => {
      const goals = [
        { title: 'Goal 1', weight: 50, scoreMidYear: null, scoreEndYear: null },
      ];
      const result = validateReviewStage(goals, [], 'goalSetting');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Goal weights must sum to 100%');
    });

    it('should require all goals to have weights', () => {
      const goals = [
        { title: 'Goal 1', weight: 0, scoreMidYear: null, scoreEndYear: null },
        { title: 'Goal 2', weight: 100, scoreMidYear: null, scoreEndYear: null },
      ];
      const result = validateReviewStage(goals, [], 'goalSetting');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All goals must have a weight assigned');
    });

    it('should pass with valid goals', () => {
      const goals = [
        { title: 'Goal 1', weight: 50, scoreMidYear: null, scoreEndYear: null },
        { title: 'Goal 2', weight: 50, scoreMidYear: null, scoreEndYear: null },
      ];
      const result = validateReviewStage(goals, [], 'goalSetting');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('midYear stage', () => {
    it('should require all goals to be scored', () => {
      const goals = [
        { title: 'Goal 1', weight: 100, scoreMidYear: null, scoreEndYear: null },
      ];
      const result = validateReviewStage(goals, sixCompetencies, 'midYear');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All goals must be scored');
    });

    it('should require all 6 competencies to be scored', () => {
      const goals = [
        { title: 'Goal 1', weight: 100, scoreMidYear: 2, scoreEndYear: null },
      ];
      const incompleteCompetencies = [
        { scoreMidYear: 2, scoreEndYear: null },
        { scoreMidYear: 2, scoreEndYear: null },
      ];
      const result = validateReviewStage(goals, incompleteCompetencies, 'midYear');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All 6 competencies must be scored');
    });

    it('should pass with complete data', () => {
      const goals = [
        { title: 'Goal 1', weight: 100, scoreMidYear: 2, scoreEndYear: null },
      ];
      const result = validateReviewStage(goals, sixCompetencies, 'midYear');
      expect(result.isValid).toBe(true);
    });
  });

  describe('endYear stage', () => {
    it('should use endYear scores for validation', () => {
      const goals = [
        { title: 'Goal 1', weight: 100, scoreMidYear: 2, scoreEndYear: null }, // no end year score
      ];
      const result = validateReviewStage(goals, sixCompetencies, 'endYear');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('All goals must be scored');
    });

    it('should pass with complete end year data', () => {
      const goals = [
        { title: 'Goal 1', weight: 100, scoreMidYear: 2, scoreEndYear: 3 },
      ];
      const competencies = sixCompetencies.map(c => ({ ...c, scoreEndYear: 2 }));
      const result = validateReviewStage(goals, competencies, 'endYear');
      expect(result.isValid).toBe(true);
    });
  });
});

describe('calculateReviewScores', () => {
  it('should calculate complete review scores', () => {
    const goals = [
      { title: 'Goal 1', weight: 50, scoreMidYear: 3, scoreEndYear: null },
      { title: 'Goal 2', weight: 50, scoreMidYear: 2, scoreEndYear: null },
    ];
    const competencies = [
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 2, scoreEndYear: null },
      { scoreMidYear: 2, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
      { scoreMidYear: 3, scoreEndYear: null },
    ];

    const result = calculateReviewScores(goals, competencies, 'midYear');

    expect(result.whatScore).toBe(2.5);
    expect(result.howScore).toBeCloseTo(2.667, 2);
    expect(result.whatGridPosition).toBe(3); // rounds up
    expect(result.howGridPosition).toBe(3);
    expect(result.gridColor).toBe('#1B5E20'); // dark green
    expect(result.gridLabel).toBe('Star Performer');
  });

  it('should return nulls for incomplete data', () => {
    const goals = [{ title: 'Goal 1', weight: 100, scoreMidYear: null, scoreEndYear: null }];
    const competencies: Array<{ scoreMidYear: number | null; scoreEndYear: number | null }> = [];

    const result = calculateReviewScores(goals, competencies, 'midYear');

    expect(result.whatScore).toBeNull();
    expect(result.howScore).toBeNull();
    expect(result.whatGridPosition).toBeNull();
    expect(result.howGridPosition).toBeNull();
    expect(result.gridColor).toBe('#E5E7EB');
    expect(result.gridLabel).toBe('');
  });
});

describe('formatScore', () => {
  it('should format score to 2 decimal places', () => {
    expect(formatScore(2.5)).toBe('2.50');
    expect(formatScore(3)).toBe('3.00');
    expect(formatScore(1.333)).toBe('1.33');
    expect(formatScore(2.666)).toBe('2.67');
  });

  it('should return dash for null', () => {
    expect(formatScore(null)).toBe('-');
  });
});
