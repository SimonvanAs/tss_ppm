import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReviewProvider, useReview } from './ReviewContext';
import AuthContext from './AuthContext';

// Mock the API
const mockReviewsApi = {
  getById: vi.fn(),
  getGoals: vi.fn(),
  getCompetencies: vi.fn(),
  update: vi.fn(),
  addGoal: vi.fn(),
  updateGoal: vi.fn(),
  deleteGoal: vi.fn(),
  reorderGoals: vi.fn(),
  updateCompetencyScore: vi.fn(),
  startStage: vi.fn(),
  completeStage: vi.fn(),
  createChangeRequest: vi.fn(),
};

vi.mock('../services/api', () => ({
  reviewsApi: {
    getById: (...args) => mockReviewsApi.getById(...args),
    getGoals: (...args) => mockReviewsApi.getGoals(...args),
    getCompetencies: (...args) => mockReviewsApi.getCompetencies(...args),
    update: (...args) => mockReviewsApi.update(...args),
    addGoal: (...args) => mockReviewsApi.addGoal(...args),
    updateGoal: (...args) => mockReviewsApi.updateGoal(...args),
    deleteGoal: (...args) => mockReviewsApi.deleteGoal(...args),
    reorderGoals: (...args) => mockReviewsApi.reorderGoals(...args),
    updateCompetencyScore: (...args) => mockReviewsApi.updateCompetencyScore(...args),
    startStage: (...args) => mockReviewsApi.startStage(...args),
    completeStage: (...args) => mockReviewsApi.completeStage(...args),
    createChangeRequest: (...args) => mockReviewsApi.createChangeRequest(...args),
  },
}));

// Mock data
const mockReview = {
  id: 'review-1',
  employeeId: 'emp-1',
  managerId: 'mgr-1',
  status: 'GOAL_SETTING',
  tovLevel: {
    id: 'tov-1',
    name: 'Level B',
    competencyLevels: [
      { id: 'cl-1', competencyId: 'comp-1', name: 'Communication' },
      { id: 'cl-2', competencyId: 'comp-2', name: 'Teamwork' },
    ],
  },
};

const mockGoals = [
  { id: 'goal-1', title: 'Goal 1', description: 'Desc 1', weight: 50, scoreMidYear: 2, scoreEndYear: null },
  { id: 'goal-2', title: 'Goal 2', description: 'Desc 2', weight: 50, scoreMidYear: 3, scoreEndYear: null },
];

const mockCompetencyScores = [
  { id: 'cs-1', competencyLevelId: 'cl-1', scoreMidYear: 2, scoreEndYear: null, notesMidYear: '', notesEndYear: '' },
  { id: 'cs-2', competencyLevelId: 'cl-2', scoreMidYear: 3, scoreEndYear: null, notesMidYear: '', notesEndYear: '' },
];

// Wrapper with mock auth
const createWrapper = (userOverrides = {}) => {
  const mockUser = {
    id: 'mgr-1',
    role: 'MANAGER',
    ...userOverrides,
  };

  return ({ children }) => (
    <AuthContext.Provider value={{ user: mockUser }}>
      <ReviewProvider reviewId="review-1">
        {children}
      </ReviewProvider>
    </AuthContext.Provider>
  );
};

describe('ReviewContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockReviewsApi.getById.mockResolvedValue(mockReview);
    mockReviewsApi.getGoals.mockResolvedValue(mockGoals);
    mockReviewsApi.getCompetencies.mockResolvedValue(mockCompetencyScores);
    mockReviewsApi.update.mockResolvedValue(mockReview);
  });

  describe('useReview hook', () => {
    it('should throw error when used outside ReviewProvider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useReview());
      }).toThrow('useReview must be used within a ReviewProvider');

      consoleSpy.mockRestore();
    });
  });

  describe('loading review data', () => {
    it('should load review data on mount', async () => {
      const { result } = renderHook(() => useReview(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.review).toEqual(mockReview);
      expect(result.current.goals).toEqual(mockGoals);
      expect(result.current.competencyScores).toEqual(mockCompetencyScores);
    });

    it('should handle loading error', async () => {
      mockReviewsApi.getById.mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useReview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.review).toBe(null);

      consoleSpy.mockRestore();
    });

    it('should call API methods with correct review ID', async () => {
      const { result } = renderHook(() => useReview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockReviewsApi.getById).toHaveBeenCalledWith('review-1');
      expect(mockReviewsApi.getGoals).toHaveBeenCalledWith('review-1');
      expect(mockReviewsApi.getCompetencies).toHaveBeenCalledWith('review-1');
    });
  });

  describe('goal operations', () => {
    describe('addGoal', () => {
      it('should add a new goal', async () => {
        const newGoal = { id: 'goal-3', title: 'New Goal', weight: 0 };
        mockReviewsApi.addGoal.mockResolvedValue(newGoal);

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.addGoal({ title: 'New Goal' });
        });

        expect(mockReviewsApi.addGoal).toHaveBeenCalledWith('review-1', { title: 'New Goal' });
        expect(result.current.goals).toContainEqual(newGoal);
      });

      it('should handle addGoal error', async () => {
        mockReviewsApi.addGoal.mockRejectedValue(new Error('Failed to add'));

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        // The addGoal should throw when API fails
        let errorThrown = false;
        try {
          await act(async () => {
            await result.current.addGoal({ title: 'New Goal' });
          });
        } catch (e) {
          errorThrown = true;
          expect(e.message).toBe('Failed to add');
        }

        expect(errorThrown).toBe(true);
      });
    });

    describe('updateGoal', () => {
      it('should update a goal', async () => {
        mockReviewsApi.updateGoal.mockResolvedValue();

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.updateGoal('goal-1', { title: 'Updated Goal' });
        });

        expect(mockReviewsApi.updateGoal).toHaveBeenCalledWith('review-1', 'goal-1', { title: 'Updated Goal' });
        expect(result.current.goals[0].title).toBe('Updated Goal');
      });
    });

    describe('removeGoal', () => {
      it('should remove a goal', async () => {
        mockReviewsApi.deleteGoal.mockResolvedValue();

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        const initialLength = result.current.goals.length;

        await act(async () => {
          await result.current.removeGoal('goal-1');
        });

        expect(mockReviewsApi.deleteGoal).toHaveBeenCalledWith('review-1', 'goal-1');
        expect(result.current.goals).toHaveLength(initialLength - 1);
        expect(result.current.goals.find(g => g.id === 'goal-1')).toBeUndefined();
      });
    });

    describe('reorderGoals', () => {
      it('should reorder goals', async () => {
        mockReviewsApi.reorderGoals.mockResolvedValue();

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        const firstGoalId = result.current.goals[0].id;

        await act(async () => {
          await result.current.reorderGoals(0, 1);
        });

        // First goal should now be second
        expect(result.current.goals[1].id).toBe(firstGoalId);
      });

      it('should revert on error', async () => {
        mockReviewsApi.reorderGoals.mockRejectedValue(new Error('Failed'));

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        const originalOrder = [...result.current.goals];

        await act(async () => {
          await result.current.reorderGoals(0, 1);
        });

        // Should revert to original order
        expect(result.current.goals.map(g => g.id)).toEqual(originalOrder.map(g => g.id));
      });
    });
  });

  describe('competency operations', () => {
    describe('updateCompetencyScore', () => {
      it('should update a competency score', async () => {
        mockReviewsApi.updateCompetencyScore.mockResolvedValue();

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.updateCompetencyScore('cs-1', { scoreMidYear: 3 });
        });

        expect(mockReviewsApi.updateCompetencyScore).toHaveBeenCalledWith('review-1', 'cs-1', { scoreMidYear: 3 });
        expect(result.current.competencyScores[0].scoreMidYear).toBe(3);
      });
    });
  });

  describe('stage transitions', () => {
    describe('startStage', () => {
      it('should start a stage', async () => {
        const updatedReview = { ...mockReview, status: 'MID_YEAR_REVIEW' };
        mockReviewsApi.startStage.mockResolvedValue(updatedReview);

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.startStage('MID_YEAR_REVIEW');
        });

        expect(mockReviewsApi.startStage).toHaveBeenCalledWith('review-1', 'MID_YEAR_REVIEW');
        expect(result.current.review.status).toBe('MID_YEAR_REVIEW');
      });
    });

    describe('completeStage', () => {
      it('should complete a stage', async () => {
        const updatedReview = { ...mockReview, status: 'MID_YEAR_COMPLETE' };
        mockReviewsApi.completeStage.mockResolvedValue(updatedReview);

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper(),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        await act(async () => {
          await result.current.completeStage('MID_YEAR_REVIEW');
        });

        expect(mockReviewsApi.completeStage).toHaveBeenCalledWith('review-1', 'MID_YEAR_REVIEW', {});
        expect(result.current.review.status).toBe('MID_YEAR_COMPLETE');
      });
    });
  });

  describe('permission functions', () => {
    describe('canEditGoals', () => {
      it('should return true for employee in GOAL_SETTING stage', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'emp-1' }), // User is the employee
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canEditGoals()).toBe(true);
      });

      it('should return true for manager in GOAL_SETTING stage', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'mgr-1' }), // User is the manager
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canEditGoals()).toBe(true);
      });

      it('should return true for HR in GOAL_SETTING stage', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'hr-1', role: 'HR' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canEditGoals()).toBe(true);
      });

      it('should return false for employee not in GOAL_SETTING stage', async () => {
        mockReviewsApi.getById.mockResolvedValue({ ...mockReview, status: 'MID_YEAR_REVIEW' });

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'emp-1' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canEditGoals()).toBe(false);
      });
    });

    describe('canScoreGoals', () => {
      it('should return true for manager in MID_YEAR_REVIEW', async () => {
        mockReviewsApi.getById.mockResolvedValue({ ...mockReview, status: 'MID_YEAR_REVIEW' });

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'mgr-1' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canScoreGoals()).toBe(true);
      });

      it('should return true for manager in END_YEAR_REVIEW', async () => {
        mockReviewsApi.getById.mockResolvedValue({ ...mockReview, status: 'END_YEAR_REVIEW' });

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'mgr-1' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canScoreGoals()).toBe(true);
      });

      it('should return false in GOAL_SETTING stage', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'mgr-1' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canScoreGoals()).toBe(false);
      });

      it('should return true for HR in scoring stage', async () => {
        mockReviewsApi.getById.mockResolvedValue({ ...mockReview, status: 'MID_YEAR_REVIEW' });

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'hr-1', role: 'HR' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canScoreGoals()).toBe(true);
      });
    });

    describe('canCompleteStage', () => {
      it('should return true for manager', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'mgr-1' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canCompleteStage()).toBe(true);
      });

      it('should return true for HR', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'hr-1', role: 'HR' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canCompleteStage()).toBe(true);
      });

      it('should return false for employee (non-manager)', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'emp-1', role: 'EMPLOYEE' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canCompleteStage()).toBe(false);
      });
    });

    describe('canRequestGoalChange', () => {
      it('should return true for employee after goals locked', async () => {
        mockReviewsApi.getById.mockResolvedValue({ ...mockReview, status: 'GOAL_SETTING_COMPLETE' });

        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'emp-1', role: 'EMPLOYEE' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canRequestGoalChange()).toBe(true);
      });

      it('should return false in GOAL_SETTING stage', async () => {
        const { result } = renderHook(() => useReview(), {
          wrapper: createWrapper({ id: 'emp-1', role: 'EMPLOYEE' }),
        });

        await waitFor(() => {
          expect(result.current.isLoading).toBe(false);
        });

        expect(result.current.canRequestGoalChange()).toBe(false);
      });
    });
  });

  describe('score calculations', () => {
    it('should provide whatScore', async () => {
      const { result } = renderHook(() => useReview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // whatScore should be defined (calculation is tested in scoring.test.js)
      expect(result.current.whatScore).toBeDefined();
    });

    it('should provide howScore', async () => {
      const { result } = renderHook(() => useReview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // howScore should be defined
      expect(result.current.howScore).toBeDefined();
    });
  });

  describe('updateReview', () => {
    it('should update review and set isDirty', async () => {
      const { result } = renderHook(() => useReview(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.updateReview({ summary: 'Test summary' });
      });

      expect(result.current.isDirty).toBe(true);
      expect(result.current.review.summary).toBe('Test summary');
    });
  });
});
