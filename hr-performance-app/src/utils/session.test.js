import { describe, it, expect } from 'vitest';
import { sanitizeInput, decodeInput } from './session';

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
