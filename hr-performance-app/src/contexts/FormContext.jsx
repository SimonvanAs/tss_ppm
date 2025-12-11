import { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sanitizeInput } from '../utils/session';
import { calculateProgress, validateForm } from '../utils/scoring';

const FormContext = createContext();

/**
 * Create initial form data structure
 */
function createInitialFormData() {
  return {
    // Employee info
    employeeName: '',
    functionTitle: '',
    tovLevel: '',
    manager: '',
    department: '',
    reviewPeriod: new Date().getFullYear().toString(),
    language: 'en',

    // Goals (WHAT-axis)
    goals: [{ id: uuidv4(), title: '', description: '', score: '', weight: '', goalType: 'STANDARD' }],

    // Competency scores (HOW-axis)
    competencyScores: {},
    competencyNotes: {},
    behaviorScores: {},
    detailedBehaviorMode: false,

    // Self-assessment
    selfAssessment: '',
    developmentGoals: '',

    // Manager comments
    managerComments: '',
    developmentPlan: '',
  };
}

/**
 * Recursively sanitize all string values in an object
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
function sanitizeFormData(data) {
  if (typeof data === 'string') {
    return sanitizeInput(data);
  }
  if (Array.isArray(data)) {
    return data.map(item => sanitizeFormData(item));
  }
  if (data !== null && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeFormData(value);
    }
    return sanitized;
  }
  return data;
}

export function FormProvider({ children }) {
  const [formData, setFormData] = useState(createInitialFormData);
  const [isDirty, setIsDirty] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Update form data
  const updateFormData = useCallback((updates) => {
    setFormData(prev => {
      const newData = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
      return newData;
    });
    setIsDirty(true);
  }, []);

  // Update a specific goal
  const updateGoal = useCallback((goalId, updates) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.map(goal =>
        goal.id === goalId ? { ...goal, ...updates } : goal
      )
    }));
    setIsDirty(true);
  }, []);

  // Add a new goal
  const addGoal = useCallback((goalType = 'STANDARD') => {
    setFormData(prev => {
      if (prev.goals.length >= 9) return prev;
      return {
        ...prev,
        goals: [...prev.goals, { id: uuidv4(), title: '', description: '', score: '', weight: '', goalType }]
      };
    });
    setIsDirty(true);
  }, []);

  // Remove a goal
  const removeGoal = useCallback((goalId) => {
    setFormData(prev => {
      if (prev.goals.length <= 1) return prev;
      return {
        ...prev,
        goals: prev.goals.filter(goal => goal.id !== goalId)
      };
    });
    setIsDirty(true);
  }, []);

  // Reorder goals (for drag and drop)
  const reorderGoals = useCallback((fromIndex, toIndex) => {
    setFormData(prev => {
      const newGoals = [...prev.goals];
      const [movedGoal] = newGoals.splice(fromIndex, 1);
      newGoals.splice(toIndex, 0, movedGoal);
      return { ...prev, goals: newGoals };
    });
    setIsDirty(true);
  }, []);

  // Update competency score
  const updateCompetencyScore = useCallback((competencyId, score) => {
    setFormData(prev => ({
      ...prev,
      competencyScores: {
        ...prev.competencyScores,
        [competencyId]: score
      }
    }));
    setIsDirty(true);
  }, []);

  // Update competency note
  const updateCompetencyNote = useCallback((competencyId, note) => {
    setFormData(prev => ({
      ...prev,
      competencyNotes: {
        ...prev.competencyNotes,
        [competencyId]: note
      }
    }));
    setIsDirty(true);
  }, []);

  // Update behavior score (for detailed HOW-axis scoring)
  const updateBehaviorScore = useCallback((competencyId, behaviorIndex, score) => {
    setFormData(prev => ({
      ...prev,
      behaviorScores: {
        ...prev.behaviorScores,
        [competencyId]: {
          ...(prev.behaviorScores?.[competencyId] || {}),
          [behaviorIndex]: score
        }
      }
    }));
    setIsDirty(true);
  }, []);

  // Toggle detailed behavior mode
  const setDetailedBehaviorMode = useCallback((enabled) => {
    setFormData(prev => ({
      ...prev,
      detailedBehaviorMode: enabled
    }));
    setIsDirty(true);
  }, []);

  // Clear behavior scores for a competency (when switching modes)
  const clearBehaviorScores = useCallback((competencyId) => {
    setFormData(prev => {
      const newBehaviorScores = { ...prev.behaviorScores };
      delete newBehaviorScores[competencyId];
      return {
        ...prev,
        behaviorScores: newBehaviorScores
      };
    });
    setIsDirty(true);
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormData(createInitialFormData());
    setIsDirty(false);
    setValidationErrors([]);
  }, []);

  // Validate form
  const validate = useCallback(() => {
    const result = validateForm(formData);
    setValidationErrors(result.errors);
    return result;
  }, [formData]);

  // Calculate progress
  const progress = calculateProgress(formData);

  const value = {
    formData,
    updateFormData,
    updateGoal,
    addGoal,
    removeGoal,
    reorderGoals,
    updateCompetencyScore,
    updateCompetencyNote,
    updateBehaviorScore,
    setDetailedBehaviorMode,
    clearBehaviorScores,
    resetForm,
    validate,
    validationErrors,
    progress,
    isDirty,
  };

  return (
    <FormContext.Provider value={value}>
      {children}
    </FormContext.Provider>
  );
}

export function useForm() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useForm must be used within a FormProvider');
  }
  return context;
}
