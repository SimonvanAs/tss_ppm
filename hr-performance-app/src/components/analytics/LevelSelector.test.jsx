import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LevelSelector } from './LevelSelector';
import { LanguageProvider } from '../../contexts/LanguageContext';

// Wrapper to provide language context
const renderWithProviders = (props = {}) => {
  const defaultProps = {
    level: 'manager',
    onLevelChange: vi.fn(),
    businessUnits: [],
    selectedBusinessUnitId: null,
    onBusinessUnitChange: vi.fn(),
    managers: [],
    selectedManagerId: null,
    onManagerChange: vi.fn(),
    disabled: false,
    ...props,
  };

  return render(
    <LanguageProvider>
      <LevelSelector {...defaultProps} />
    </LanguageProvider>
  );
};

describe('LevelSelector', () => {
  describe('Level tabs', () => {
    it('should render all level tabs', () => {
      renderWithProviders();
      expect(screen.getByText('Team')).toBeInTheDocument();
      expect(screen.getByText('Business Unit')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
    });

    it('should call onLevelChange when tab clicked', () => {
      const onLevelChange = vi.fn();
      renderWithProviders({ onLevelChange });

      fireEvent.click(screen.getByText('Business Unit'));
      expect(onLevelChange).toHaveBeenCalledWith('bu');
    });
  });

  describe('Business Unit selector', () => {
    const businessUnits = [
      { id: 'bu-1', name: 'BU One', code: 'BU1' },
      { id: 'bu-2', name: 'BU Two', code: 'BU2' },
    ];

    it('should show BU selector when level is bu', () => {
      renderWithProviders({ level: 'bu', businessUnits });
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should not show BU selector when level is not bu', () => {
      renderWithProviders({ level: 'manager', businessUnits });
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should have filter-select class for proper styling (regression test for issue #71)', () => {
      renderWithProviders({ level: 'bu', businessUnits });
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('filter-select');
    });

    it('should render all business unit options', () => {
      renderWithProviders({ level: 'bu', businessUnits });
      expect(screen.getByText('BU One (BU1)')).toBeInTheDocument();
      expect(screen.getByText('BU Two (BU2)')).toBeInTheDocument();
    });
  });

  describe('Manager selector', () => {
    const managers = [
      { id: 'mgr-1', firstName: 'John', lastName: 'Doe' },
      { id: 'mgr-2', firstName: 'Jane', lastName: 'Smith' },
    ];

    it('should show manager selector when level is manager', () => {
      renderWithProviders({ level: 'manager', managers });
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should not show manager selector when level is not manager', () => {
      renderWithProviders({ level: 'company', managers });
      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('should have filter-select class for proper styling (regression test for issue #71)', () => {
      renderWithProviders({ level: 'manager', managers });
      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('filter-select');
    });

    it('should render all manager options', () => {
      renderWithProviders({ level: 'manager', managers });
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('should have default My Team option', () => {
      renderWithProviders({ level: 'manager', managers });
      // Check for default option (translation key or fallback text)
      const select = screen.getByRole('combobox');
      const firstOption = select.querySelector('option[value=""]');
      expect(firstOption).toBeInTheDocument();
    });
  });

  describe('Disabled state', () => {
    it('should disable level tabs when disabled', () => {
      renderWithProviders({ disabled: true });
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeDisabled();
      });
    });

    it('should disable selects when disabled', () => {
      const managers = [{ id: 'mgr-1', firstName: 'John', lastName: 'Doe' }];
      renderWithProviders({ level: 'manager', managers, disabled: true });
      expect(screen.getByRole('combobox')).toBeDisabled();
    });
  });
});
