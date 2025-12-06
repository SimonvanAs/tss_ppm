import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  generateSessionCode,
  saveSession,
  loadSession,
  deleteSession,
  createInitialFormData,
  cleanupExpiredSessions
} from '../utils/session';
import { calculateProgress, validateForm } from '../utils/scoring';

const FormContext = createContext();

export function FormProvider({ children }) {
  const [sessionCode, setSessionCode] = useState(() => generateSessionCode());
  const [formData, setFormData] = useState(createInitialFormData);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [validationErrors, setValidationErrors] = useState([]);
  const saveTimeoutRef = useRef(null);

  // Cleanup expired sessions on mount
  useEffect(() => {
    cleanupExpiredSessions();
  }, []);

  // Auto-save after 2-3 seconds of inactivity
  useEffect(() => {
    if (!isDirty) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      saveSession(sessionCode, formData);
      setLastSaved(new Date());
      setIsDirty(false);
    }, 2500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formData, isDirty, sessionCode]);

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
  const addGoal = useCallback(() => {
    setFormData(prev => {
      if (prev.goals.length >= 9) return prev;
      return {
        ...prev,
        goals: [...prev.goals, { id: uuidv4(), title: '', description: '', score: '', weight: '' }]
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

  // Resume a session
  const resumeSession = useCallback((code) => {
    const session = loadSession(code);
    if (session) {
      setSessionCode(code.toUpperCase());
      setFormData(session);
      setIsDirty(false);
      return true;
    }
    return false;
  }, []);

  // Start a new session
  const startNewSession = useCallback(() => {
    const newCode = generateSessionCode();
    setSessionCode(newCode);
    setFormData(createInitialFormData());
    setIsDirty(false);
    setLastSaved(null);
    setValidationErrors([]);
  }, []);

  // Clear current session
  const clearSession = useCallback(() => {
    deleteSession(sessionCode);
    startNewSession();
  }, [sessionCode, startNewSession]);

  // Validate form
  const validate = useCallback(() => {
    const result = validateForm(formData);
    setValidationErrors(result.errors);
    return result;
  }, [formData]);

  // Calculate progress
  const progress = calculateProgress(formData);

  const value = {
    sessionCode,
    formData,
    updateFormData,
    updateGoal,
    addGoal,
    removeGoal,
    reorderGoals,
    updateCompetencyScore,
    resumeSession,
    startNewSession,
    clearSession,
    validate,
    validationErrors,
    progress,
    lastSaved,
    isDirty
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
