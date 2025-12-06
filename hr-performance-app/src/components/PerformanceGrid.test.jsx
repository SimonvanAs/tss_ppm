import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PerformanceGrid } from './PerformanceGrid';
import { LanguageProvider } from '../contexts/LanguageContext';
import { FormProvider } from '../contexts/FormContext';

// Custom wrapper with controlled form data
const renderWithProviders = (formDataOverride = {}) => {
  const defaultFormData = {
    goals: [],
    competencyScores: {},
    tovLevel: '',
    ...formDataOverride,
  };

  // We need to mock the form context to control the data
  return render(
    <LanguageProvider>
      <FormProvider initialData={defaultFormData}>
        <PerformanceGrid />
      </FormProvider>
    </LanguageProvider>
  );
};

describe('PerformanceGrid', () => {
  beforeEach(() => {
    localStorage.getItem.mockReturnValue(null);
  });

  it('should render grid section title', () => {
    renderWithProviders();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('should render 9 grid cells', () => {
    renderWithProviders();
    const gridCells = document.querySelectorAll('.grid-cell');
    expect(gridCells).toHaveLength(9);
  });

  it('should render WHAT and HOW axis labels', () => {
    renderWithProviders();
    expect(screen.getByText('WHAT')).toBeInTheDocument();
    expect(screen.getByText('HOW')).toBeInTheDocument();
  });

  it('should render axis numbers 1-3', () => {
    renderWithProviders();
    // X-axis and Y-axis both have 1, 2, 3
    const ones = screen.getAllByText('1');
    const twos = screen.getAllByText('2');
    const threes = screen.getAllByText('3');

    expect(ones.length).toBeGreaterThanOrEqual(2);
    expect(twos.length).toBeGreaterThanOrEqual(2);
    expect(threes.length).toBeGreaterThanOrEqual(2);
  });

  it('should render legend with all colors', () => {
    renderWithProviders();

    expect(screen.getByText('Immediate attention')).toBeInTheDocument();
    expect(screen.getByText('Development area')).toBeInTheDocument();
    expect(screen.getByText('Good performance')).toBeInTheDocument();
    expect(screen.getByText('Exceptional')).toBeInTheDocument();
  });

  it('should display dash for scores when no data', () => {
    renderWithProviders();

    // Should show '-' for both scores when no goals/competencies
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('should render score labels', () => {
    renderWithProviders();

    expect(screen.getByText(/WHAT Score/i)).toBeInTheDocument();
    expect(screen.getByText(/HOW Score/i)).toBeInTheDocument();
  });
});
