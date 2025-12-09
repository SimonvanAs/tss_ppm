import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { reviewsApi } from '../services/api';
import { calculateWhatScore, calculateHowScore as calculateHowScoreFromObject } from '../utils/scoring';

// Helper to convert API competency scores array to object format for scoring
function competencyScoresToObject(competencyScores, stage) {
  const scoreField = stage === 'END_YEAR_REVIEW' ? 'scoreEndYear' : 'scoreMidYear';
  return competencyScores.reduce((acc, cs) => {
    const score = cs[scoreField];
    if (score !== null && score !== undefined) {
      acc[cs.competencyLevelId] = score;
    }
    return acc;
  }, {});
}

// Helper to convert API goals array to format for scoring
function goalsToScoringFormat(goals, stage) {
  const scoreField = stage === 'END_YEAR_REVIEW' ? 'scoreEndYear' : 'scoreMidYear';
  return goals.map(g => ({
    ...g,
    score: g[scoreField],
  }));
}

const ReviewContext = createContext();

/**
 * Context for managing a single review's state with API persistence
 */
export function ReviewProvider({ children, reviewId }) {
  const { user } = useAuth();
  const [review, setReview] = useState(null);
  const [goals, setGoals] = useState([]);
  const [competencyScores, setCompetencyScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const saveTimeoutRef = useRef(null);

  // Load review data
  useEffect(() => {
    if (reviewId) {
      loadReview();
    }
  }, [reviewId]);

  // Auto-save after 2.5 seconds of inactivity
  useEffect(() => {
    if (!isDirty || !review) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveReview();
    }, 2500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, review, goals, competencyScores]);

  const loadReview = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [reviewData, goalsData, competenciesData] = await Promise.all([
        reviewsApi.getById(reviewId),
        reviewsApi.getGoals(reviewId),
        reviewsApi.getCompetencies(reviewId),
      ]);

      setReview(reviewData);
      setGoals(goalsData || []);
      setCompetencyScores(competenciesData || []);
    } catch (err) {
      console.error('Failed to load review:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReview = async () => {
    if (!review || isSaving) return;

    try {
      setIsSaving(true);

      // Calculate scores
      const whatScore = calculateWhatScore(goals);
      const howScore = calculateHowScore(competencyScores);

      // Determine which score fields to update based on stage
      const scoreUpdates = {};
      if (review.status === 'MID_YEAR_REVIEW') {
        scoreUpdates.whatScoreMidYear = whatScore;
        scoreUpdates.howScoreMidYear = howScore;
      } else if (review.status === 'END_YEAR_REVIEW') {
        scoreUpdates.whatScoreEndYear = whatScore;
        scoreUpdates.howScoreEndYear = howScore;
      }

      // Update review
      await reviewsApi.update(reviewId, {
        ...review,
        ...scoreUpdates,
      });

      setLastSaved(new Date());
      setIsDirty(false);
    } catch (err) {
      console.error('Failed to save review:', err);
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Manual save
  const manualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveReview();
  }, [review, goals, competencyScores]);

  // Update review fields
  const updateReview = useCallback((updates) => {
    setReview(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  // Goal operations
  const addGoal = useCallback(async (goalData) => {
    try {
      const newGoal = await reviewsApi.addGoal(reviewId, goalData);
      setGoals(prev => [...prev, newGoal]);
      setIsDirty(true);
      return newGoal;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [reviewId]);

  const updateGoal = useCallback(async (goalId, updates) => {
    try {
      await reviewsApi.updateGoal(reviewId, goalId, updates);
      setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updates } : g));
      setIsDirty(true);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [reviewId]);

  const removeGoal = useCallback(async (goalId) => {
    try {
      await reviewsApi.deleteGoal(reviewId, goalId);
      setGoals(prev => prev.filter(g => g.id !== goalId));
      setIsDirty(true);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [reviewId]);

  const reorderGoals = useCallback(async (fromIndex, toIndex) => {
    const newGoals = [...goals];
    const [movedGoal] = newGoals.splice(fromIndex, 1);
    newGoals.splice(toIndex, 0, movedGoal);
    setGoals(newGoals);

    try {
      await reviewsApi.reorderGoals(reviewId, newGoals.map(g => g.id));
      setIsDirty(true);
    } catch (err) {
      setError(err.message);
      // Revert on error
      setGoals(goals);
    }
  }, [reviewId, goals]);

  // Competency operations
  const updateCompetencyScore = useCallback(async (scoreId, updates) => {
    try {
      await reviewsApi.updateCompetencyScore(reviewId, scoreId, updates);
      setCompetencyScores(prev =>
        prev.map(cs => cs.id === scoreId ? { ...cs, ...updates } : cs)
      );
      setIsDirty(true);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [reviewId]);

  // Stage transitions
  const startStage = useCallback(async (stage) => {
    try {
      const updatedReview = await reviewsApi.startStage(reviewId, stage);
      setReview(updatedReview);
      return updatedReview;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [reviewId]);

  const completeStage = useCallback(async (stage, data = {}) => {
    try {
      const updatedReview = await reviewsApi.completeStage(reviewId, stage, data);
      setReview(updatedReview);
      return updatedReview;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [reviewId]);

  // Goal change requests
  const requestGoalChange = useCallback(async (goalId, changeType, proposedData, reason) => {
    try {
      const request = await reviewsApi.createChangeRequest(reviewId, {
        goalId,
        changeType,
        proposedData,
        reason,
      });
      return request;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [reviewId]);

  // Permission checks based on role and stage
  const canEditGoals = useCallback(() => {
    if (!review || !user) return false;

    // In goal setting stage, employee can edit
    if (review.status === 'GOAL_SETTING' && review.employeeId === user.id) {
      return true;
    }

    // Manager can always edit during goal setting
    if (review.status === 'GOAL_SETTING' && review.managerId === user.id) {
      return true;
    }

    // HR and admin can always edit in goal setting
    if (review.status === 'GOAL_SETTING' &&
        ['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'].includes(user.role)) {
      return true;
    }

    return false;
  }, [review, user]);

  const canScoreGoals = useCallback(() => {
    if (!review || !user) return false;

    const scoringStages = ['MID_YEAR_REVIEW', 'END_YEAR_REVIEW'];
    if (!scoringStages.includes(review.status)) return false;

    // Manager can score
    if (review.managerId === user.id) return true;

    // HR and admin can score
    if (['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'].includes(user.role)) return true;

    return false;
  }, [review, user]);

  const canCompleteStage = useCallback(() => {
    if (!review || !user) return false;

    // Manager can complete stages
    if (review.managerId === user.id) return true;

    // HR and admin can complete stages
    if (['HR', 'OPCO_ADMIN', 'TSS_SUPER_ADMIN'].includes(user.role)) return true;

    return false;
  }, [review, user]);

  const canRequestGoalChange = useCallback(() => {
    if (!review || !user) return false;

    // Can only request changes after goals are locked
    const lockedStages = [
      'GOAL_SETTING_COMPLETE',
      'MID_YEAR_REVIEW',
      'MID_YEAR_COMPLETE',
      'END_YEAR_REVIEW',
    ];

    if (!lockedStages.includes(review.status)) return false;

    // Employee can request changes to their own review
    if (review.employeeId === user.id) return true;

    return false;
  }, [review, user]);

  // Calculate current scores based on review stage
  const scoringGoals = review ? goalsToScoringFormat(goals, review.status) : goals;
  const scoringCompetencies = review
    ? competencyScoresToObject(competencyScores, review.status)
    : {};
  const whatScore = calculateWhatScore(scoringGoals);
  const howScore = calculateHowScoreFromObject(scoringCompetencies);

  const value = {
    // State
    review,
    goals,
    competencyScores,
    isLoading,
    isSaving,
    error,
    isDirty,
    lastSaved,
    whatScore,
    howScore,

    // Actions
    loadReview,
    saveReview,
    manualSave,
    updateReview,
    addGoal,
    updateGoal,
    removeGoal,
    reorderGoals,
    updateCompetencyScore,
    startStage,
    completeStage,
    requestGoalChange,

    // Permissions
    canEditGoals,
    canScoreGoals,
    canCompleteStage,
    canRequestGoalChange,
  };

  return (
    <ReviewContext.Provider value={value}>
      {children}
    </ReviewContext.Provider>
  );
}

export function useReview() {
  const context = useContext(ReviewContext);
  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
}
