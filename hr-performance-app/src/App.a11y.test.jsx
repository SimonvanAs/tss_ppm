import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { PerformanceGrid } from './components/PerformanceGrid';
import { LanguageProvider } from './contexts/LanguageContext';
import { FormProvider } from './contexts/FormContext';

// Note: axe matchers are extended in src/test/setup.js

// Helper to render with providers
const renderWithProviders = (ui, { formDataOverride = {} } = {}) => {
  const defaultFormData = {
    goals: [],
    competencyScores: {},
    tovLevel: '',
    ...formDataOverride,
  };

  return render(
    <LanguageProvider>
      <FormProvider initialData={defaultFormData}>
        {ui}
      </FormProvider>
    </LanguageProvider>
  );
};

describe('Accessibility Tests', () => {
  beforeEach(() => {
    localStorage.getItem.mockReturnValue(null);
  });

  describe('PerformanceGrid', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithProviders(<PerformanceGrid />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Basic HTML structure', () => {
    it('should have accessible heading hierarchy', async () => {
      const { container } = renderWithProviders(<PerformanceGrid />);

      // Check that heading exists
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible color legend', async () => {
      const { container } = renderWithProviders(<PerformanceGrid />);

      // Verify legend items are present
      expect(screen.getByText('Immediate attention')).toBeInTheDocument();
      expect(screen.getByText('Development area')).toBeInTheDocument();
      expect(screen.getByText('Good performance')).toBeInTheDocument();
      expect(screen.getByText('Exceptional')).toBeInTheDocument();

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('ARIA attributes', () => {
    it('should have proper grid cell structure', async () => {
      const { container } = renderWithProviders(<PerformanceGrid />);

      // Check that grid cells are present
      const gridCells = container.querySelectorAll('.grid-cell');
      expect(gridCells).toHaveLength(9);

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Color contrast', () => {
    it('should have adequate color contrast in score display', async () => {
      const formDataWithScores = {
        goals: [
          { title: 'Goal 1', score: '2', weight: 100 }
        ],
        competencyScores: { 'comp-1': 2, 'comp-2': 2, 'comp-3': 2, 'comp-4': 2, 'comp-5': 2, 'comp-6': 2 },
        tovLevel: 'A',
      };

      const { container } = renderWithProviders(
        <PerformanceGrid />,
        { formDataOverride: formDataWithScores }
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
