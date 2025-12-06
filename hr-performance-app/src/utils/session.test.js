import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateSessionCode,
  cleanupExpiredSessions,
  saveSession,
  loadSession,
  deleteSession,
  getDaysRemaining,
  createInitialFormData,
  sanitizeInput,
  decodeInput,
} from './session';

describe('generateSessionCode', () => {
  it('should generate a 10-character code', () => {
    const code = generateSessionCode();
    expect(code).toHaveLength(10);
  });

  it('should generate uppercase alphanumeric characters', () => {
    const code = generateSessionCode();
    expect(code).toMatch(/^[A-Z0-9]+$/);
  });

  it('should generate unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateSessionCode());
    }
    expect(codes.size).toBe(100);
  });
});

describe('saveSession and loadSession', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should save and load a session', () => {
    const sessionCode = 'TEST123456';
    const formData = { employeeName: 'John Doe', role: 'Developer' };

    localStorage.getItem.mockReturnValueOnce(null);
    saveSession(sessionCode, formData);

    expect(localStorage.setItem).toHaveBeenCalled();
    const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
    expect(savedData[sessionCode]).toBeDefined();
    expect(savedData[sessionCode].employeeName).toBe('John Doe');
    expect(savedData[sessionCode].timestamp).toBeDefined();
  });

  it('should return null for non-existent session', () => {
    localStorage.getItem.mockReturnValue('{}');
    const result = loadSession('NOTEXIST');
    expect(result).toBeNull();
  });

  it('should return null for expired session', () => {
    const expiredSession = {
      TEST123456: {
        employeeName: 'John',
        timestamp: Date.now() - (15 * 24 * 60 * 60 * 1000), // 15 days ago
      },
    };
    localStorage.getItem.mockReturnValue(JSON.stringify(expiredSession));

    const result = loadSession('TEST123456');
    expect(result).toBeNull();
  });

  it('should load valid non-expired session', () => {
    const validSession = {
      TEST123456: {
        employeeName: 'John',
        timestamp: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    };
    localStorage.getItem.mockReturnValue(JSON.stringify(validSession));

    const result = loadSession('TEST123456');
    expect(result).not.toBeNull();
    expect(result.employeeName).toBe('John');
  });

  it('should handle case-insensitive session codes', () => {
    const validSession = {
      TEST123456: {
        employeeName: 'John',
        timestamp: Date.now(),
      },
    };
    localStorage.getItem.mockReturnValue(JSON.stringify(validSession));

    const result = loadSession('test123456');
    expect(result).not.toBeNull();
  });
});

describe('deleteSession', () => {
  it('should remove session from storage', () => {
    const sessions = {
      TEST123456: { employeeName: 'John', timestamp: Date.now() },
      OTHER12345: { employeeName: 'Jane', timestamp: Date.now() },
    };
    localStorage.getItem.mockReturnValue(JSON.stringify(sessions));

    deleteSession('TEST123456');

    const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
    expect(savedData['TEST123456']).toBeUndefined();
    expect(savedData['OTHER12345']).toBeDefined();
  });
});

describe('cleanupExpiredSessions', () => {
  it('should remove expired sessions', () => {
    const sessions = {
      EXPIRED123: {
        employeeName: 'Old User',
        timestamp: Date.now() - (20 * 24 * 60 * 60 * 1000), // 20 days ago
      },
      VALID12345: {
        employeeName: 'Recent User',
        timestamp: Date.now() - (5 * 24 * 60 * 60 * 1000), // 5 days ago
      },
    };
    localStorage.getItem.mockReturnValue(JSON.stringify(sessions));

    cleanupExpiredSessions();

    const savedData = JSON.parse(localStorage.setItem.mock.calls[0][1]);
    expect(savedData['EXPIRED123']).toBeUndefined();
    expect(savedData['VALID12345']).toBeDefined();
  });

  it('should handle empty storage', () => {
    localStorage.getItem.mockReturnValue(null);
    expect(() => cleanupExpiredSessions()).not.toThrow();
  });
});

describe('getDaysRemaining', () => {
  it('should return 14 for fresh session', () => {
    const session = { timestamp: Date.now() };
    expect(getDaysRemaining(session)).toBe(14);
  });

  it('should return correct days for older session', () => {
    const session = { timestamp: Date.now() - (10 * 24 * 60 * 60 * 1000) };
    expect(getDaysRemaining(session)).toBe(4);
  });

  it('should return 0 for expired session', () => {
    const session = { timestamp: Date.now() - (20 * 24 * 60 * 60 * 1000) };
    expect(getDaysRemaining(session)).toBe(0);
  });

  it('should return 0 for session without timestamp', () => {
    expect(getDaysRemaining({})).toBe(0);
    expect(getDaysRemaining(null)).toBe(0);
  });
});

describe('createInitialFormData', () => {
  it('should create form data with all required fields', () => {
    const data = createInitialFormData();

    expect(data.employeeName).toBe('');
    expect(data.role).toBe('');
    expect(data.businessUnit).toBe('');
    expect(data.tovLevel).toBe('');
    expect(data.reviewDate).toBeDefined();
    expect(data.goals).toHaveLength(1);
    expect(data.competencyScores).toEqual({});
    expect(data.language).toBe('en');
  });

  it('should set reviewDate to today', () => {
    const data = createInitialFormData();
    const today = new Date().toISOString().split('T')[0];
    expect(data.reviewDate).toBe(today);
  });

  it('should create goal with unique id', () => {
    const data = createInitialFormData();
    expect(data.goals[0].id).toBeDefined();
    expect(data.goals[0].id).toHaveLength(36); // UUID format
  });
});

describe('sanitizeInput', () => {
  it('should escape HTML entities', () => {
    expect(sanitizeInput('<script>')).toBe('&lt;script&gt;');
    expect(sanitizeInput('"quotes"')).toBe('&quot;quotes&quot;');
    expect(sanitizeInput("'apostrophe'")).toBe('&#x27;apostrophe&#x27;');
    expect(sanitizeInput('a/b')).toBe('a&#x2F;b');
    expect(sanitizeInput('a&b')).toBe('a&amp;b');
  });

  it('should return non-strings unchanged', () => {
    expect(sanitizeInput(123)).toBe(123);
    expect(sanitizeInput(null)).toBeNull();
    expect(sanitizeInput(undefined)).toBeUndefined();
  });

  it('should handle normal text', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
  });

  it('should handle complex XSS attempts', () => {
    const xss = '<img src="x" onerror="alert(\'XSS\')">';
    const sanitized = sanitizeInput(xss);
    expect(sanitized).not.toContain('<');
    expect(sanitized).not.toContain('>');
  });
});

describe('decodeInput', () => {
  it('should decode HTML entities', () => {
    expect(decodeInput('&lt;script&gt;')).toBe('<script>');
    expect(decodeInput('&quot;quotes&quot;')).toBe('"quotes"');
    expect(decodeInput('&#x27;apostrophe&#x27;')).toBe("'apostrophe'");
    expect(decodeInput('a&#x2F;b')).toBe('a/b');
    expect(decodeInput('a&amp;b')).toBe('a&b');
  });

  it('should return non-strings unchanged', () => {
    expect(decodeInput(123)).toBe(123);
    expect(decodeInput(null)).toBeNull();
  });

  it('should be reversible with sanitizeInput', () => {
    const original = '<test & "value">';
    const sanitized = sanitizeInput(original);
    const decoded = decodeInput(sanitized);
    expect(decoded).toBe(original);
  });
});
