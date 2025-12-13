import { describe, it, expect } from 'vitest';
import en from '../languages/en.json';
import nl from '../languages/nl.json';
import es from '../languages/es.json';

// Bug #49: Buttons and fields displaying placeholder keys - regression test
// This test ensures all translation keys are complete and no placeholders remain

// Recursively get all keys from a nested object
const getAllKeys = (obj, prefix = '') => {
  let keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys = keys.concat(getAllKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
};

// Get value by dot-notation key path
const getValueByPath = (obj, path) => {
  return path.split('.').reduce((current, key) => current?.[key], obj);
};

describe('Translation completeness', () => {
  const enKeys = getAllKeys(en);
  const nlKeys = getAllKeys(nl);
  const esKeys = getAllKeys(es);

  describe('Dutch translations', () => {
    it('should have all English keys', () => {
      const missingKeys = enKeys.filter(key => !nlKeys.includes(key));
      if (missingKeys.length > 0) {
        console.log('Missing keys in Dutch:', missingKeys);
      }
      expect(missingKeys).toEqual([]);
    });

    it('should not have extra keys not in English', () => {
      const extraKeys = nlKeys.filter(key => !enKeys.includes(key));
      if (extraKeys.length > 0) {
        console.log('Extra keys in Dutch:', extraKeys);
      }
      expect(extraKeys).toEqual([]);
    });
  });

  describe('Spanish translations', () => {
    it('should have all English keys', () => {
      const missingKeys = enKeys.filter(key => !esKeys.includes(key));
      if (missingKeys.length > 0) {
        console.log('Missing keys in Spanish:', missingKeys);
      }
      expect(missingKeys).toEqual([]);
    });

    it('should not have extra keys not in English', () => {
      const extraKeys = esKeys.filter(key => !enKeys.includes(key));
      if (extraKeys.length > 0) {
        console.log('Extra keys in Spanish:', extraKeys);
      }
      expect(extraKeys).toEqual([]);
    });
  });

  describe('Translation values', () => {
    it('should not have empty string values in English', () => {
      const emptyKeys = enKeys.filter(key => {
        const value = getValueByPath(en, key);
        return value === '';
      });
      if (emptyKeys.length > 0) {
        console.log('Empty values in English:', emptyKeys);
      }
      expect(emptyKeys).toEqual([]);
    });

    it('should not have empty string values in Dutch', () => {
      const emptyKeys = nlKeys.filter(key => {
        const value = getValueByPath(nl, key);
        return value === '';
      });
      if (emptyKeys.length > 0) {
        console.log('Empty values in Dutch:', emptyKeys);
      }
      expect(emptyKeys).toEqual([]);
    });

    it('should not have empty string values in Spanish', () => {
      const emptyKeys = esKeys.filter(key => {
        const value = getValueByPath(es, key);
        return value === '';
      });
      if (emptyKeys.length > 0) {
        console.log('Empty values in Spanish:', emptyKeys);
      }
      expect(emptyKeys).toEqual([]);
    });

    it('should not have placeholder patterns (key.subkey format) as values', () => {
      // This catches cases where translation values look like untranslated keys
      // e.g., "admin.backToApp" as a value instead of actual text
      const checkPlaceholders = (obj, prefix = '') => {
        const issues = [];
        for (const [key, value] of Object.entries(obj)) {
          const fullKey = prefix ? `${prefix}.${key}` : key;
          if (typeof value === 'object' && value !== null) {
            issues.push(...checkPlaceholders(value, fullKey));
          } else if (typeof value === 'string') {
            // Check if value looks like an untranslated key (word.word pattern without spaces)
            // Exclude legitimate patterns like URLs, version strings, etc.
            if (/^[a-z]+\.[a-zA-Z]+(\.[a-zA-Z]+)*$/.test(value) && !value.includes(' ')) {
              issues.push({ key: fullKey, value });
            }
          }
        }
        return issues;
      };

      const enIssues = checkPlaceholders(en);
      const nlIssues = checkPlaceholders(nl);
      const esIssues = checkPlaceholders(es);

      if (enIssues.length > 0) {
        console.log('Placeholder-like values in English:', enIssues);
      }
      if (nlIssues.length > 0) {
        console.log('Placeholder-like values in Dutch:', nlIssues);
      }
      if (esIssues.length > 0) {
        console.log('Placeholder-like values in Spanish:', esIssues);
      }

      expect(enIssues).toEqual([]);
      expect(nlIssues).toEqual([]);
      expect(esIssues).toEqual([]);
    });
  });

  describe('Key count consistency', () => {
    it('should have the same number of keys across all languages', () => {
      expect(nlKeys.length).toBe(enKeys.length);
      expect(esKeys.length).toBe(enKeys.length);
    });
  });
});
