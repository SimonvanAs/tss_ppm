import { describe, it, expect } from 'vitest';
import {
  calculateWhatScore,
  calculateHowScore,
  mapLevelToGrid,
  roundToGridPosition,
  getGridColor,
  validateWeights,
  calculateTotalWeight,
  validateForm,
  calculateProgress,
} from './scoring';

describe('calculateWhatScore', () => {
  it('should return null for empty goals array', () => {
    expect(calculateWhatScore([])).toBeNull();
  });

  it('should return null when no goals have content', () => {
    const goals = [
      { title: '', score: 2, weight: 50 },
      { title: '   ', score: 3, weight: 50 },
    ];
    expect(calculateWhatScore(goals)).toBeNull();
  });

  it('should calculate weighted average correctly', () => {
    const goals = [
      { title: 'Goal 1', score: 3, weight: 60 },
      { title: 'Goal 2', score: 2, weight: 40 },
    ];
    // (3*60 + 2*40) / 100 = 260/100 = 2.6
    const result = calculateWhatScore(goals);
    expect(result.score).toBeCloseTo(2.6);
    expect(result.hasScfVeto).toBe(false);
  });

  it('should handle single goal', () => {
    const goals = [{ title: 'Goal 1', score: 2, weight: 100 }];
    const result = calculateWhatScore(goals);
    expect(result.score).toBe(2);
    expect(result.hasScfVeto).toBe(false);
  });

  it('should ignore goals without scores or weights', () => {
    const goals = [
      { title: 'Goal 1', score: 3, weight: 100 },
      { title: 'Goal 2', score: null, weight: 50 },
      { title: 'Goal 3', score: 2, weight: 0 },
    ];
    const result = calculateWhatScore(goals);
    expect(result.score).toBe(3);
    expect(result.hasScfVeto).toBe(false);
  });

  it('should handle three goals with different weights', () => {
    const goals = [
      { title: 'Goal 1', score: 1, weight: 20 },
      { title: 'Goal 2', score: 2, weight: 30 },
      { title: 'Goal 3', score: 3, weight: 50 },
    ];
    // (1*20 + 2*30 + 3*50) / 100 = 230/100 = 2.3
    const result = calculateWhatScore(goals);
    expect(result.score).toBeCloseTo(2.3);
    expect(result.hasScfVeto).toBe(false);
  });

  it('should return SCF VETO when any SCF goal fails', () => {
    const goals = [
      { title: 'Goal 1', score: 3, weight: 50 },
      { title: 'Goal 2', score: 3, weight: 50 },
      { title: 'SCF Check', goalType: 'SCF', scfValue: 'FAIL' },
    ];
    const result = calculateWhatScore(goals);
    expect(result.score).toBe(1.00);
    expect(result.hasScfVeto).toBe(true);
  });

  it('should not VETO when SCF goal passes', () => {
    const goals = [
      { title: 'Goal 1', score: 3, weight: 50 },
      { title: 'Goal 2', score: 3, weight: 50 },
      { title: 'SCF Check', goalType: 'SCF', scfValue: 'PASS' },
    ];
    const result = calculateWhatScore(goals);
    expect(result.score).toBe(3);
    expect(result.hasScfVeto).toBe(false);
  });
});

describe('calculateHowScore', () => {
  it('should return null when less than 6 scores', () => {
    const scores = { comp1: 2, comp2: 3, comp3: 2 };
    expect(calculateHowScore(scores)).toBeNull();
  });

  it('should return null for empty scores', () => {
    expect(calculateHowScore({})).toBeNull();
  });

  it('should apply VETO rule when any score is 1', () => {
    const scores = {
      comp1: 3, comp2: 2, comp3: 3,
      comp4: 1, comp5: 2, comp6: 3,
    };
    expect(calculateHowScore(scores)).toBe(1.00);
  });

  it('should calculate average when no VETO', () => {
    const scores = {
      comp1: 2, comp2: 2, comp3: 2,
      comp4: 3, comp5: 3, comp6: 2,
    };
    // (2+2+2+3+3+2) / 6 = 14/6 = 2.333...
    expect(calculateHowScore(scores)).toBeCloseTo(2.333);
  });

  it('should return 3 when all scores are 3', () => {
    const scores = {
      comp1: 3, comp2: 3, comp3: 3,
      comp4: 3, comp5: 3, comp6: 3,
    };
    expect(calculateHowScore(scores)).toBe(3);
  });

  it('should return 2 when all scores are 2', () => {
    const scores = {
      comp1: 2, comp2: 2, comp3: 2,
      comp4: 2, comp5: 2, comp6: 2,
    };
    expect(calculateHowScore(scores)).toBe(2);
  });

  it('should ignore null/undefined values in count', () => {
    const scores = {
      comp1: 2, comp2: 2, comp3: null,
      comp4: 2, comp5: undefined, comp6: 2,
    };
    expect(calculateHowScore(scores)).toBeNull();
  });
});

describe('mapLevelToGrid', () => {
  it('should map A to 1', () => {
    expect(mapLevelToGrid('A')).toBe(1);
  });

  it('should map B to 2', () => {
    expect(mapLevelToGrid('B')).toBe(2);
  });

  it('should map C to 3', () => {
    expect(mapLevelToGrid('C')).toBe(3);
  });

  it('should map D to 3', () => {
    expect(mapLevelToGrid('D')).toBe(3);
  });

  it('should return null for invalid level', () => {
    expect(mapLevelToGrid('E')).toBeNull();
    expect(mapLevelToGrid('')).toBeNull();
    expect(mapLevelToGrid(null)).toBeNull();
  });
});

describe('roundToGridPosition', () => {
  it('should round 1.4 to 1', () => {
    expect(roundToGridPosition(1.4)).toBe(1);
  });

  it('should round 1.5 to 2', () => {
    expect(roundToGridPosition(1.5)).toBe(2);
  });

  it('should round 2.6 to 3', () => {
    expect(roundToGridPosition(2.6)).toBe(3);
  });

  it('should return null for null/undefined', () => {
    expect(roundToGridPosition(null)).toBeNull();
    expect(roundToGridPosition(undefined)).toBeNull();
  });

  it('should handle exact integers', () => {
    expect(roundToGridPosition(1)).toBe(1);
    expect(roundToGridPosition(2)).toBe(2);
    expect(roundToGridPosition(3)).toBe(3);
  });
});

describe('getGridColor', () => {
  it('should return red for position 1-1', () => {
    expect(getGridColor(1, 1)).toBe('#DC3545');
  });

  it('should return dark green for position 3-3', () => {
    expect(getGridColor(3, 3)).toBe('#1B5E20');
  });

  it('should return green for position 2-2', () => {
    expect(getGridColor(2, 2)).toBe('#28A745');
  });

  it('should return orange for edge positions', () => {
    expect(getGridColor(1, 2)).toBe('#FFA500');
    expect(getGridColor(2, 1)).toBe('#FFA500');
    expect(getGridColor(3, 1)).toBe('#FFA500');
    expect(getGridColor(1, 3)).toBe('#FFA500');
  });

  it('should return gray for invalid positions', () => {
    expect(getGridColor(null, 1)).toBe('#E5E7EB');
    expect(getGridColor(1, null)).toBe('#E5E7EB');
    expect(getGridColor(0, 0)).toBe('#E5E7EB');
  });
});

describe('validateWeights', () => {
  it('should return true when weights sum to 100', () => {
    const goals = [
      { title: 'Goal 1', weight: 60 },
      { title: 'Goal 2', weight: 40 },
    ];
    expect(validateWeights(goals)).toBe(true);
  });

  it('should return false when weights do not sum to 100', () => {
    const goals = [
      { title: 'Goal 1', weight: 50 },
      { title: 'Goal 2', weight: 30 },
    ];
    expect(validateWeights(goals)).toBe(false);
  });

  it('should return true for empty goals', () => {
    expect(validateWeights([])).toBe(true);
  });

  it('should ignore goals without titles', () => {
    const goals = [
      { title: 'Goal 1', weight: 100 },
      { title: '', weight: 50 },
    ];
    expect(validateWeights(goals)).toBe(true);
  });

  it('should handle floating point precision', () => {
    const goals = [
      { title: 'Goal 1', weight: 33.33 },
      { title: 'Goal 2', weight: 33.33 },
      { title: 'Goal 3', weight: 33.34 },
    ];
    expect(validateWeights(goals)).toBe(true);
  });
});

describe('calculateTotalWeight', () => {
  it('should sum weights of goals with titles', () => {
    const goals = [
      { title: 'Goal 1', weight: 40 },
      { title: 'Goal 2', weight: 35 },
      { title: '', weight: 25 },
    ];
    expect(calculateTotalWeight(goals)).toBe(75);
  });

  it('should return 0 for empty goals', () => {
    expect(calculateTotalWeight([])).toBe(0);
  });

  it('should handle null/undefined weights', () => {
    const goals = [
      { title: 'Goal 1', weight: null },
      { title: 'Goal 2', weight: undefined },
    ];
    expect(calculateTotalWeight(goals)).toBe(0);
  });
});

describe('validateForm', () => {
  const validFormData = {
    employeeName: 'John Doe',
    functionTitle: 'ft-uuid-123',
    businessUnit: 'Engineering',
    tovLevel: 'B',
    reviewDate: '2024-01-15',
    goals: [
      { title: 'Goal 1', score: 2, weight: 50 },
      { title: 'Goal 2', score: 3, weight: 50 },
    ],
    competencyScores: {
      comp1: 2, comp2: 2, comp3: 3,
      comp4: 2, comp5: 3, comp6: 2,
    },
  };

  it('should validate complete form', () => {
    const result = validateForm(validFormData);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect missing employee name', () => {
    const data = { ...validFormData, employeeName: '' };
    const result = validateForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('employeeName');
  });

  it('should detect missing TOV level', () => {
    const data = { ...validFormData, tovLevel: null };
    const result = validateForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('tovLevel');
  });

  it('should detect missing goals', () => {
    const data = { ...validFormData, goals: [] };
    const result = validateForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('goals');
  });

  it('should detect invalid weight sum', () => {
    const data = {
      ...validFormData,
      goals: [
        { title: 'Goal 1', score: 2, weight: 30 },
        { title: 'Goal 2', score: 3, weight: 30 },
      ],
    };
    const result = validateForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('weightSum');
  });

  it('should detect incomplete competency scores', () => {
    const data = {
      ...validFormData,
      competencyScores: { comp1: 2, comp2: 3 },
    };
    const result = validateForm(data);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('competencies');
  });
});

describe('calculateProgress', () => {
  it('should return 0 for empty form', () => {
    expect(calculateProgress({})).toBe(0);
  });

  it('should calculate partial progress for employee info', () => {
    const data = {
      employeeName: 'John',
      functionTitle: 'ft-uuid-123',
    };
    // 2/5 * 30% = 12%
    expect(calculateProgress(data)).toBe(12);
  });

  it('should include goal progress', () => {
    const data = {
      employeeName: 'John',
      functionTitle: 'ft-uuid-123',
      businessUnit: 'Eng',
      tovLevel: 'B',
      reviewDate: '2024-01-01',
      goals: [
        { title: 'Goal 1', score: 2, weight: 100 },
      ],
    };
    // Employee: 5/5 * 30 = 30
    // Goals: scored (10) + weighted (10) + valid weights (10) = 30
    // Competencies: 0
    // Summary: 0
    expect(calculateProgress(data)).toBe(60);
  });

  it('should include summary progress', () => {
    const data = {
      employeeName: 'John',
      summary: 'This is a summary',
    };
    // Employee: 1/5 * 30 = 6
    // Summary: 20
    expect(calculateProgress(data)).toBe(26);
  });

  it('should calculate 100% for complete form', () => {
    const data = {
      employeeName: 'John',
      functionTitle: 'ft-uuid-123',
      businessUnit: 'Eng',
      tovLevel: 'B',
      reviewDate: '2024-01-01',
      goals: [{ title: 'Goal 1', score: 2, weight: 100 }],
      competencyScores: {
        comp1: 2, comp2: 2, comp3: 2,
        comp4: 2, comp5: 2, comp6: 2,
      },
      summary: 'Summary text',
    };
    expect(calculateProgress(data)).toBe(100);
  });
});
