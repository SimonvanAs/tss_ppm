import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { FormProvider, useForm } from './FormContext';

describe('FormContext', () => {
  describe('useForm hook', () => {
    it('should throw error when used outside FormProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useForm());
      }).toThrow('useForm must be used within a FormProvider');

      consoleSpy.mockRestore();
    });

    it('should provide form context when used within FormProvider', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      expect(result.current.formData).toBeDefined();
      expect(result.current.updateFormData).toBeDefined();
      expect(result.current.progress).toBeDefined();
    });
  });

  describe('initial form data', () => {
    it('should have correct initial structure', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      const { formData } = result.current;

      expect(formData.employeeName).toBe('');
      expect(formData.functionTitle).toBe('');
      expect(formData.tovLevel).toBe('');
      expect(formData.manager).toBe('');
      expect(formData.department).toBe('');
      expect(formData.reviewPeriod).toBe(new Date().getFullYear().toString());
      expect(formData.language).toBe('en');
      expect(formData.goals).toHaveLength(1);
      expect(formData.competencyScores).toEqual({});
      expect(formData.competencyNotes).toEqual({});
      expect(formData.behaviorScores).toEqual({});
      expect(formData.detailedBehaviorMode).toBe(false);
      expect(formData.selfAssessment).toBe('');
      expect(formData.developmentGoals).toBe('');
      expect(formData.managerComments).toBe('');
      expect(formData.developmentPlan).toBe('');
    });

    it('should have initial goal with correct structure', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      const goal = result.current.formData.goals[0];

      expect(goal.id).toBeDefined();
      expect(goal.title).toBe('');
      expect(goal.description).toBe('');
      expect(goal.score).toBe('');
      expect(goal.weight).toBe('');
      expect(goal.goalType).toBe('STANDARD');
    });

    it('should not be dirty initially', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('updateFormData', () => {
    it('should update form data with object', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      act(() => {
        result.current.updateFormData({ employeeName: 'John Doe' });
      });

      expect(result.current.formData.employeeName).toBe('John Doe');
    });

    it('should update multiple fields at once', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      act(() => {
        result.current.updateFormData({
          employeeName: 'John Doe',
          functionTitle: 'Developer',
          tovLevel: 'B',
        });
      });

      expect(result.current.formData.employeeName).toBe('John Doe');
      expect(result.current.formData.functionTitle).toBe('Developer');
      expect(result.current.formData.tovLevel).toBe('B');
    });

    it('should support function updater', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      act(() => {
        result.current.updateFormData({ employeeName: 'John' });
      });

      act(() => {
        result.current.updateFormData(prev => ({
          ...prev,
          employeeName: prev.employeeName + ' Doe',
        }));
      });

      expect(result.current.formData.employeeName).toBe('John Doe');
    });

    it('should set isDirty to true', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      expect(result.current.isDirty).toBe(false);

      act(() => {
        result.current.updateFormData({ employeeName: 'John' });
      });

      expect(result.current.isDirty).toBe(true);
    });
  });

  describe('goal management', () => {
    describe('addGoal', () => {
      it('should add a new goal', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        expect(result.current.formData.goals).toHaveLength(1);

        act(() => {
          result.current.addGoal();
        });

        expect(result.current.formData.goals).toHaveLength(2);
      });

      it('should add goal with correct structure', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.addGoal();
        });

        const newGoal = result.current.formData.goals[1];
        expect(newGoal.id).toBeDefined();
        expect(newGoal.title).toBe('');
        expect(newGoal.description).toBe('');
        expect(newGoal.score).toBe('');
        expect(newGoal.weight).toBe('');
        expect(newGoal.goalType).toBe('STANDARD');
      });

      it('should add goal with custom goalType', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.addGoal('SCF');
        });

        expect(result.current.formData.goals[1].goalType).toBe('SCF');
      });

      it('should not add more than 9 goals', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        // Add 8 more goals (starting from 1)
        for (let i = 0; i < 8; i++) {
          act(() => {
            result.current.addGoal();
          });
        }

        expect(result.current.formData.goals).toHaveLength(9);

        // Try to add one more
        act(() => {
          result.current.addGoal();
        });

        // Should still be 9
        expect(result.current.formData.goals).toHaveLength(9);
      });

      it('should set isDirty to true', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.addGoal();
        });

        expect(result.current.isDirty).toBe(true);
      });
    });

    describe('removeGoal', () => {
      it('should remove a goal', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        // Add a second goal
        act(() => {
          result.current.addGoal();
        });

        const goalToRemove = result.current.formData.goals[1].id;

        act(() => {
          result.current.removeGoal(goalToRemove);
        });

        expect(result.current.formData.goals).toHaveLength(1);
      });

      it('should not remove the last goal', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        expect(result.current.formData.goals).toHaveLength(1);

        const goalId = result.current.formData.goals[0].id;

        act(() => {
          result.current.removeGoal(goalId);
        });

        // Should still have 1 goal
        expect(result.current.formData.goals).toHaveLength(1);
      });

      it('should set isDirty to true', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        // Add second goal first
        act(() => {
          result.current.addGoal();
        });

        // Reset dirty flag manually (not possible in real code, but for testing)
        const goalId = result.current.formData.goals[1].id;

        act(() => {
          result.current.removeGoal(goalId);
        });

        expect(result.current.isDirty).toBe(true);
      });
    });

    describe('updateGoal', () => {
      it('should update a specific goal', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        const goalId = result.current.formData.goals[0].id;

        act(() => {
          result.current.updateGoal(goalId, { title: 'My Goal' });
        });

        expect(result.current.formData.goals[0].title).toBe('My Goal');
      });

      it('should update multiple goal fields', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        const goalId = result.current.formData.goals[0].id;

        act(() => {
          result.current.updateGoal(goalId, {
            title: 'My Goal',
            description: 'Goal description',
            score: '3',
            weight: '50',
          });
        });

        const goal = result.current.formData.goals[0];
        expect(goal.title).toBe('My Goal');
        expect(goal.description).toBe('Goal description');
        expect(goal.score).toBe('3');
        expect(goal.weight).toBe('50');
      });

      it('should only update the specified goal', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        // Add a second goal
        act(() => {
          result.current.addGoal();
        });

        const firstGoalId = result.current.formData.goals[0].id;

        act(() => {
          result.current.updateGoal(firstGoalId, { title: 'First Goal' });
        });

        expect(result.current.formData.goals[0].title).toBe('First Goal');
        expect(result.current.formData.goals[1].title).toBe('');
      });
    });

    describe('reorderGoals', () => {
      it('should reorder goals by moving from one index to another', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        // Add two more goals
        act(() => {
          result.current.addGoal();
          result.current.addGoal();
        });

        // Set titles to track order
        act(() => {
          result.current.updateGoal(result.current.formData.goals[0].id, { title: 'Goal A' });
          result.current.updateGoal(result.current.formData.goals[1].id, { title: 'Goal B' });
          result.current.updateGoal(result.current.formData.goals[2].id, { title: 'Goal C' });
        });

        // Move Goal A (index 0) to index 2
        act(() => {
          result.current.reorderGoals(0, 2);
        });

        expect(result.current.formData.goals[0].title).toBe('Goal B');
        expect(result.current.formData.goals[1].title).toBe('Goal C');
        expect(result.current.formData.goals[2].title).toBe('Goal A');
      });

      it('should set isDirty to true', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.addGoal();
        });

        act(() => {
          result.current.reorderGoals(0, 1);
        });

        expect(result.current.isDirty).toBe(true);
      });
    });
  });

  describe('competency management', () => {
    describe('updateCompetencyScore', () => {
      it('should update a competency score', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateCompetencyScore('comp1', 3);
        });

        expect(result.current.formData.competencyScores.comp1).toBe(3);
      });

      it('should update multiple competency scores', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateCompetencyScore('comp1', 3);
          result.current.updateCompetencyScore('comp2', 2);
          result.current.updateCompetencyScore('comp3', 1);
        });

        expect(result.current.formData.competencyScores).toEqual({
          comp1: 3,
          comp2: 2,
          comp3: 1,
        });
      });

      it('should set isDirty to true', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateCompetencyScore('comp1', 2);
        });

        expect(result.current.isDirty).toBe(true);
      });
    });

    describe('updateCompetencyNote', () => {
      it('should update a competency note', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateCompetencyNote('comp1', 'Good performance');
        });

        expect(result.current.formData.competencyNotes.comp1).toBe('Good performance');
      });

      it('should set isDirty to true', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateCompetencyNote('comp1', 'Note');
        });

        expect(result.current.isDirty).toBe(true);
      });
    });

    describe('updateBehaviorScore', () => {
      it('should update a behavior score', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateBehaviorScore('comp1', 0, 3);
        });

        expect(result.current.formData.behaviorScores.comp1[0]).toBe(3);
      });

      it('should handle multiple behaviors for same competency', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateBehaviorScore('comp1', 0, 3);
          result.current.updateBehaviorScore('comp1', 1, 2);
          result.current.updateBehaviorScore('comp1', 2, 1);
        });

        expect(result.current.formData.behaviorScores.comp1).toEqual({
          0: 3,
          1: 2,
          2: 1,
        });
      });

      it('should set isDirty to true', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateBehaviorScore('comp1', 0, 2);
        });

        expect(result.current.isDirty).toBe(true);
      });
    });

    describe('setDetailedBehaviorMode', () => {
      it('should enable detailed behavior mode', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        expect(result.current.formData.detailedBehaviorMode).toBe(false);

        act(() => {
          result.current.setDetailedBehaviorMode(true);
        });

        expect(result.current.formData.detailedBehaviorMode).toBe(true);
      });

      it('should disable detailed behavior mode', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.setDetailedBehaviorMode(true);
        });

        act(() => {
          result.current.setDetailedBehaviorMode(false);
        });

        expect(result.current.formData.detailedBehaviorMode).toBe(false);
      });
    });

    describe('clearBehaviorScores', () => {
      it('should clear behavior scores for a competency', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateBehaviorScore('comp1', 0, 3);
          result.current.updateBehaviorScore('comp1', 1, 2);
        });

        expect(result.current.formData.behaviorScores.comp1).toBeDefined();

        act(() => {
          result.current.clearBehaviorScores('comp1');
        });

        expect(result.current.formData.behaviorScores.comp1).toBeUndefined();
      });

      it('should only clear specified competency', () => {
        const { result } = renderHook(() => useForm(), {
          wrapper: FormProvider,
        });

        act(() => {
          result.current.updateBehaviorScore('comp1', 0, 3);
          result.current.updateBehaviorScore('comp2', 0, 2);
        });

        act(() => {
          result.current.clearBehaviorScores('comp1');
        });

        expect(result.current.formData.behaviorScores.comp1).toBeUndefined();
        expect(result.current.formData.behaviorScores.comp2).toEqual({ 0: 2 });
      });
    });
  });

  describe('resetForm', () => {
    it('should reset form to initial state', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      // Make some changes
      act(() => {
        result.current.updateFormData({ employeeName: 'John Doe' });
        result.current.addGoal();
        result.current.updateCompetencyScore('comp1', 3);
      });

      expect(result.current.formData.employeeName).toBe('John Doe');
      expect(result.current.formData.goals).toHaveLength(2);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.formData.employeeName).toBe('');
      expect(result.current.formData.goals).toHaveLength(1);
      expect(result.current.formData.competencyScores).toEqual({});
    });

    it('should reset isDirty to false', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      act(() => {
        result.current.updateFormData({ employeeName: 'John' });
      });

      expect(result.current.isDirty).toBe(true);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.isDirty).toBe(false);
    });

    it('should clear validation errors', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      // Validate to generate errors (empty form will have errors)
      act(() => {
        result.current.validate();
      });

      expect(result.current.validationErrors.length).toBeGreaterThan(0);

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.validationErrors).toEqual([]);
    });
  });

  describe('validate', () => {
    it('should validate form and return result', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      let validationResult;
      act(() => {
        validationResult = result.current.validate();
      });

      expect(validationResult).toBeDefined();
      expect(validationResult.errors).toBeDefined();
    });

    it('should set validation errors', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      act(() => {
        result.current.validate();
      });

      // Empty form should have errors
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('progress', () => {
    it('should calculate progress', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      expect(result.current.progress).toBeDefined();
      expect(typeof result.current.progress).toBe('number');
    });

    it('should increase progress as form is filled', () => {
      const { result } = renderHook(() => useForm(), {
        wrapper: FormProvider,
      });

      const initialProgress = result.current.progress;

      act(() => {
        result.current.updateFormData({
          employeeName: 'John Doe',
          functionTitle: 'Developer',
          tovLevel: 'B',
          manager: 'Jane Smith',
        });
      });

      expect(result.current.progress).toBeGreaterThan(initialProgress);
    });
  });
});
