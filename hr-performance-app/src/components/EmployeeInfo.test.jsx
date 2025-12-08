import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '../test/test-utils';
import { EmployeeInfo } from './EmployeeInfo';

describe('EmployeeInfo', () => {
  it('should render all employee info fields', () => {
    render(<EmployeeInfo />);

    expect(screen.getByLabelText(/employee name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/function title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/business unit/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/ide-level/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/review date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/manager/i)).toBeInTheDocument();
  });

  it('should render IDE-Level dropdown with options', () => {
    render(<EmployeeInfo />);

    const select = screen.getByLabelText(/ide-level/i);
    expect(select).toBeInTheDocument();

    // Check options exist
    expect(screen.getByRole('option', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'C' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'D' })).toBeInTheDocument();
  });

  it('should render section title', () => {
    render(<EmployeeInfo />);

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('should show required field indicators', () => {
    render(<EmployeeInfo />);

    // Check for asterisks indicating required fields
    const labels = screen.getAllByText(/\*/);
    expect(labels.length).toBeGreaterThan(0);
  });

  it('should render voice input indicators', () => {
    render(<EmployeeInfo />);

    // Voice input components should be present (may be buttons or spans depending on browser support)
    const voiceElements = document.querySelectorAll('.input-with-voice');
    expect(voiceElements.length).toBeGreaterThan(0);
  });

  it('should have date input for review date', () => {
    render(<EmployeeInfo />);

    const dateInput = screen.getByLabelText(/review date/i);
    expect(dateInput).toHaveAttribute('type', 'date');
  });
});
