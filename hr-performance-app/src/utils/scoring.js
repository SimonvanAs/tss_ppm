// Scoring utility functions

/**
 * Calculate WHAT-axis score (weighted average of goals)
 * @param {Array} goals - Array of goal objects with score and weight
 * @returns {number} Weighted average score (1.00 - 3.00)
 */
export function calculateWhatScore(goals) {
  const validGoals = goals.filter(g => g.title.trim() && g.score && g.weight);

  if (validGoals.length === 0) return null;

  const totalWeight = validGoals.reduce((sum, g) => sum + Number(g.weight), 0);

  if (totalWeight === 0) return null;

  const weightedSum = validGoals.reduce((sum, g) => {
    return sum + (Number(g.score) * Number(g.weight));
  }, 0);

  return weightedSum / totalWeight;
}

/**
 * Calculate HOW-axis score with VETO rule
 * If any competency score = 1, HOW Score = 1.00
 * Otherwise, average of all 6 competency scores
 * @param {Object} competencyScores - Object mapping competency IDs to scores
 * @returns {number|null} HOW score (1.00 - 3.00) or null if incomplete
 */
export function calculateHowScore(competencyScores) {
  const scores = Object.values(competencyScores).filter(s => s !== null && s !== undefined);

  if (scores.length !== 6) return null;

  // VETO RULE: If any score is 1, HOW Score = 1.00
  if (scores.some(s => Number(s) === 1)) {
    return 1.00;
  }

  const sum = scores.reduce((acc, s) => acc + Number(s), 0);
  return sum / 6;
}

/**
 * Map TOV-Level to grid position (for 3x3 grid)
 * A=1, B=2, C=3, D=3
 * @param {string} level - TOV-Level (A, B, C, D)
 * @returns {number} Grid position (1, 2, or 3)
 */
export function mapLevelToGrid(level) {
  const mapping = { A: 1, B: 2, C: 3, D: 3 };
  return mapping[level] || null;
}

/**
 * Round WHAT score to grid position
 * @param {number} score - WHAT score (1.00 - 3.00)
 * @returns {number} Grid position (1, 2, or 3)
 */
export function roundToGridPosition(score) {
  if (score === null || score === undefined) return null;
  return Math.round(score);
}

/**
 * Get grid cell color based on position
 * @param {number} whatPos - WHAT position (1-3)
 * @param {number} howPos - HOW position (1-3)
 * @returns {string} Color code
 */
export function getGridColor(whatPos, howPos) {
  if (!whatPos || !howPos) return '#E5E7EB'; // gray

  const colorMap = {
    '1-1': '#DC3545', // Red
    '1-2': '#FFA500', // Orange
    '1-3': '#FFA500', // Orange
    '2-1': '#FFA500', // Orange
    '2-2': '#28A745', // Green
    '2-3': '#28A745', // Green
    '3-1': '#FFA500', // Orange
    '3-2': '#28A745', // Green
    '3-3': '#1B5E20', // Dark Green
  };

  return colorMap[`${whatPos}-${howPos}`] || '#E5E7EB';
}

/**
 * Validate weights sum to 100%
 * @param {Array} goals - Array of goal objects with weight
 * @returns {boolean} True if weights sum to 100%
 */
export function validateWeights(goals) {
  const goalsWithContent = goals.filter(g => g.title.trim());
  if (goalsWithContent.length === 0) return true;

  const totalWeight = goalsWithContent.reduce((sum, g) => sum + (Number(g.weight) || 0), 0);
  return Math.abs(totalWeight - 100) < 0.01;
}

/**
 * Calculate total weight of goals
 * @param {Array} goals - Array of goal objects with weight
 * @returns {number} Total weight
 */
export function calculateTotalWeight(goals) {
  return goals
    .filter(g => g.title.trim())
    .reduce((sum, g) => sum + (Number(g.weight) || 0), 0);
}

/**
 * Check if form is complete and ready for download
 * @param {Object} formData - Complete form data
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateForm(formData) {
  const errors = [];

  // Employee info validation
  if (!formData.employeeName?.trim()) {
    errors.push('employeeName');
  }
  if (!formData.role?.trim()) {
    errors.push('role');
  }
  if (!formData.businessUnit?.trim()) {
    errors.push('businessUnit');
  }
  if (!formData.tovLevel) {
    errors.push('tovLevel');
  }
  if (!formData.reviewDate) {
    errors.push('reviewDate');
  }

  // Goals validation
  const goalsWithContent = formData.goals?.filter(g => g.title.trim()) || [];

  if (goalsWithContent.length === 0) {
    errors.push('goals');
  } else {
    // Check all goals with content have scores and weights
    const allScored = goalsWithContent.every(g => g.score);
    const allWeighted = goalsWithContent.every(g => g.weight > 0);

    if (!allScored) errors.push('goalScores');
    if (!allWeighted) errors.push('goalWeights');

    // Check weights sum to 100%
    if (!validateWeights(formData.goals)) {
      errors.push('weightSum');
    }
  }

  // Competencies validation
  if (formData.tovLevel) {
    const competencyScores = formData.competencyScores || {};
    const scores = Object.values(competencyScores).filter(s => s !== null && s !== undefined);
    if (scores.length !== 6) {
      errors.push('competencies');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate progress percentage
 * @param {Object} formData - Complete form data
 * @returns {number} Progress percentage (0-100)
 */
export function calculateProgress(formData) {
  let progress = 0;

  // Employee info (30%)
  const employeeFields = ['employeeName', 'role', 'businessUnit', 'tovLevel', 'reviewDate'];
  const filledEmployeeFields = employeeFields.filter(field => formData[field]?.toString().trim());
  progress += (filledEmployeeFields.length / employeeFields.length) * 30;

  // Goals (30%)
  const goalsWithContent = formData.goals?.filter(g => g.title.trim()) || [];
  if (goalsWithContent.length > 0) {
    const scoredGoals = goalsWithContent.filter(g => g.score);
    const weightedGoals = goalsWithContent.filter(g => g.weight > 0);
    const validWeights = validateWeights(formData.goals);

    const goalProgress = (
      (scoredGoals.length / goalsWithContent.length) * 10 +
      (weightedGoals.length / goalsWithContent.length) * 10 +
      (validWeights ? 10 : 0)
    );
    progress += goalProgress;
  }

  // Competencies (20%)
  if (formData.tovLevel) {
    const competencyScores = formData.competencyScores || {};
    const scores = Object.values(competencyScores).filter(s => s !== null && s !== undefined);
    progress += (scores.length / 6) * 20;
  }

  // Summary (20%)
  if (formData.summary?.trim()) {
    progress += 20;
  }

  return Math.round(progress);
}
