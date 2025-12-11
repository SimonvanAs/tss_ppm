// Historical data transformation utilities

import { roundToGridPosition, getGridColor } from './scoring';

/**
 * Transform review cycles into trend data for charts
 * @param {Array} reviews - Array of review cycle objects
 * @returns {Array} Sorted array of trend data points by year
 */
export function transformReviewsToTrendData(reviews) {
  if (!reviews || reviews.length === 0) return [];

  return reviews
    .map(review => ({
      year: review.year,
      whatScoreMidYear: review.whatScoreMidYear,
      whatScoreEndYear: review.whatScoreEndYear,
      howScoreMidYear: review.howScoreMidYear,
      howScoreEndYear: review.howScoreEndYear,
      whatScore: review.whatScoreEndYear || review.whatScoreMidYear,
      howScore: review.howScoreEndYear || review.howScoreMidYear,
      whatPosition: roundToGridPosition(review.whatScoreEndYear || review.whatScoreMidYear),
      howPosition: roundToGridPosition(review.howScoreEndYear || review.howScoreMidYear),
      status: review.status,
      tovLevelCode: review.tovLevel?.code || review.tovLevelCode,
    }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Calculate year-over-year change
 * @param {number} currentScore - Current year score
 * @param {number} previousScore - Previous year score
 * @returns {{ delta: number, direction: 'up' | 'down' | 'stable', percentage: number }}
 */
export function calculateYearOverYearChange(currentScore, previousScore) {
  if (currentScore == null || previousScore == null) {
    return { delta: null, direction: 'stable', percentage: null };
  }

  const delta = currentScore - previousScore;
  const percentage = previousScore !== 0 ? ((delta / previousScore) * 100) : 0;

  let direction = 'stable';
  if (delta > 0.05) direction = 'up';
  else if (delta < -0.05) direction = 'down';

  return {
    delta: Number(delta.toFixed(2)),
    direction,
    percentage: Number(percentage.toFixed(1)),
  };
}

/**
 * Get grid position history from reviews
 * @param {Array} reviews - Array of review cycle objects
 * @returns {Array} Array of { year, whatPosition, howPosition, color, label }
 */
export function getGridPositionHistory(reviews) {
  const trendData = transformReviewsToTrendData(reviews);

  return trendData.map(data => {
    const whatPos = data.whatPosition;
    const howPos = data.howPosition;
    const color = getGridColor(whatPos, howPos);
    const label = getPerformanceLabel(whatPos, howPos);

    return {
      year: data.year,
      whatPosition: whatPos,
      howPosition: howPos,
      whatScore: data.whatScore,
      howScore: data.howScore,
      color,
      label,
      gridCode: whatPos && howPos ? `${getGridLetter(howPos)}${whatPos}` : null,
    };
  });
}

/**
 * Get performance label based on grid position
 * @param {number} whatPos - WHAT position (1-3)
 * @param {number} howPos - HOW position (1-3)
 * @returns {string} Performance label
 */
export function getPerformanceLabel(whatPos, howPos) {
  if (!whatPos || !howPos) return 'Incomplete';

  const labels = {
    '1-1': 'Concern',
    '1-2': 'Needs Development',
    '1-3': 'Potential',
    '2-1': 'Underperformer',
    '2-2': 'Solid Performer',
    '2-3': 'High Performer',
    '3-1': 'Inconsistent',
    '3-2': 'Strong Contributor',
    '3-3': 'Top Talent',
  };

  return labels[`${whatPos}-${howPos}`] || 'Unknown';
}

/**
 * Convert grid position to letter (1=C, 2=B, 3=A)
 * @param {number} position - Grid position (1-3)
 * @returns {string} Letter (A, B, C)
 */
export function getGridLetter(position) {
  const letters = { 1: 'C', 2: 'B', 3: 'A' };
  return letters[position] || '?';
}

/**
 * Calculate statistics from historical reviews
 * @param {Array} reviews - Array of review cycle objects
 * @returns {Object} Statistics object
 */
export function calculateHistoryStats(reviews) {
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      yearsSpan: 0,
      firstYear: null,
      lastYear: null,
      avgWhatScore: null,
      avgHowScore: null,
      latestWhatScore: null,
      latestHowScore: null,
      latestGridPosition: null,
      completedReviews: 0,
      trend: 'stable',
    };
  }

  const sortedReviews = [...reviews].sort((a, b) => a.year - b.year);
  const completedReviews = reviews.filter(r =>
    r.status === 'COMPLETED' || r.whatScoreEndYear != null
  );

  // Calculate averages from completed reviews with scores
  const reviewsWithWhatScores = completedReviews.filter(r => r.whatScoreEndYear != null);
  const reviewsWithHowScores = completedReviews.filter(r => r.howScoreEndYear != null);

  const avgWhatScore = reviewsWithWhatScores.length > 0
    ? reviewsWithWhatScores.reduce((sum, r) => sum + r.whatScoreEndYear, 0) / reviewsWithWhatScores.length
    : null;

  const avgHowScore = reviewsWithHowScores.length > 0
    ? reviewsWithHowScores.reduce((sum, r) => sum + r.howScoreEndYear, 0) / reviewsWithHowScores.length
    : null;

  // Get latest scores
  const latestReview = sortedReviews[sortedReviews.length - 1];
  const latestWhatScore = latestReview?.whatScoreEndYear || latestReview?.whatScoreMidYear;
  const latestHowScore = latestReview?.howScoreEndYear || latestReview?.howScoreMidYear;

  // Calculate trend (comparing last 2 years if available)
  let trend = 'stable';
  if (sortedReviews.length >= 2) {
    const current = sortedReviews[sortedReviews.length - 1];
    const previous = sortedReviews[sortedReviews.length - 2];
    const currentTotal = (current.whatScoreEndYear || 0) + (current.howScoreEndYear || 0);
    const previousTotal = (previous.whatScoreEndYear || 0) + (previous.howScoreEndYear || 0);

    if (currentTotal > previousTotal + 0.1) trend = 'up';
    else if (currentTotal < previousTotal - 0.1) trend = 'down';
  }

  return {
    totalReviews: reviews.length,
    yearsSpan: sortedReviews.length > 0
      ? sortedReviews[sortedReviews.length - 1].year - sortedReviews[0].year + 1
      : 0,
    firstYear: sortedReviews[0]?.year || null,
    lastYear: sortedReviews[sortedReviews.length - 1]?.year || null,
    avgWhatScore: avgWhatScore ? Number(avgWhatScore.toFixed(2)) : null,
    avgHowScore: avgHowScore ? Number(avgHowScore.toFixed(2)) : null,
    latestWhatScore: latestWhatScore ? Number(latestWhatScore.toFixed(2)) : null,
    latestHowScore: latestHowScore ? Number(latestHowScore.toFixed(2)) : null,
    latestGridPosition: latestWhatScore && latestHowScore
      ? `${getGridLetter(roundToGridPosition(latestHowScore))}${roundToGridPosition(latestWhatScore)}`
      : null,
    completedReviews: completedReviews.length,
    trend,
  };
}

/**
 * Build year-over-year comparison data
 * @param {Array} reviews - Array of review cycle objects
 * @returns {Object} Comparison data with years and metrics
 */
export function buildYearOverYearComparison(reviews) {
  const trendData = transformReviewsToTrendData(reviews);

  const years = trendData.map(d => d.year);
  const metrics = {
    whatScoreEndYear: {},
    howScoreEndYear: {},
    whatScoreMidYear: {},
    howScoreMidYear: {},
    gridPosition: {},
    status: {},
  };

  trendData.forEach(data => {
    metrics.whatScoreEndYear[data.year] = data.whatScoreEndYear;
    metrics.howScoreEndYear[data.year] = data.howScoreEndYear;
    metrics.whatScoreMidYear[data.year] = data.whatScoreMidYear;
    metrics.howScoreMidYear[data.year] = data.howScoreMidYear;
    metrics.gridPosition[data.year] = data.whatPosition && data.howPosition
      ? `${getGridLetter(data.howPosition)}${data.whatPosition}`
      : null;
    metrics.status[data.year] = data.status;
  });

  // Calculate changes between consecutive years
  const changes = {};
  for (let i = 1; i < years.length; i++) {
    const prevYear = years[i - 1];
    const currYear = years[i];

    changes[currYear] = {
      whatChange: calculateYearOverYearChange(
        metrics.whatScoreEndYear[currYear],
        metrics.whatScoreEndYear[prevYear]
      ),
      howChange: calculateYearOverYearChange(
        metrics.howScoreEndYear[currYear],
        metrics.howScoreEndYear[prevYear]
      ),
    };
  }

  return { years, metrics, changes };
}

/**
 * Filter reviews by year range
 * @param {Array} reviews - Array of review cycle objects
 * @param {number} fromYear - Start year (inclusive)
 * @param {number} toYear - End year (inclusive)
 * @returns {Array} Filtered reviews
 */
export function filterReviewsByYearRange(reviews, fromYear, toYear) {
  if (!reviews) return [];

  return reviews.filter(review => {
    if (fromYear && review.year < fromYear) return false;
    if (toYear && review.year > toYear) return false;
    return true;
  });
}

/**
 * Get unique years from reviews
 * @param {Array} reviews - Array of review cycle objects
 * @returns {Array} Sorted array of unique years
 */
export function getUniqueYears(reviews) {
  if (!reviews || reviews.length === 0) return [];
  return [...new Set(reviews.map(r => r.year))].sort((a, b) => a - b);
}
