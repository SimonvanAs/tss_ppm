import { describe, it, expect } from 'vitest';
import { competencies, levelDescriptions } from './competencies';

describe('competencies', () => {
  describe('structure', () => {
    it('should have all 4 TOV levels (A, B, C, D)', () => {
      expect(competencies).toHaveProperty('A');
      expect(competencies).toHaveProperty('B');
      expect(competencies).toHaveProperty('C');
      expect(competencies).toHaveProperty('D');
    });

    it('should have exactly 6 competencies for each level', () => {
      expect(competencies.A).toHaveLength(6);
      expect(competencies.B).toHaveLength(6);
      expect(competencies.C).toHaveLength(6);
      expect(competencies.D).toHaveLength(6);
    });

    it('should have total of 24 competencies', () => {
      const total = Object.values(competencies).reduce((sum, level) => sum + level.length, 0);
      expect(total).toBe(24);
    });
  });

  describe('competency structure', () => {
    const allCompetencies = Object.values(competencies).flat();

    it('each competency should have required fields', () => {
      allCompetencies.forEach(comp => {
        expect(comp).toHaveProperty('id');
        expect(comp).toHaveProperty('category');
        expect(comp).toHaveProperty('subcategory');
        expect(comp).toHaveProperty('title');
        expect(comp).toHaveProperty('indicators');
      });
    });

    it('each competency should have unique id', () => {
      const ids = allCompetencies.map(c => c.id);
      const uniqueIds = [...new Set(ids)];
      expect(uniqueIds).toHaveLength(ids.length);
    });
  });

  describe('multilingual support', () => {
    const allCompetencies = Object.values(competencies).flat();

    it('each competency title should have all 3 languages', () => {
      allCompetencies.forEach(comp => {
        expect(comp.title).toHaveProperty('en');
        expect(comp.title).toHaveProperty('nl');
        expect(comp.title).toHaveProperty('es');
      });
    });

    it('each competency indicators should have all 3 languages', () => {
      allCompetencies.forEach(comp => {
        expect(comp.indicators).toHaveProperty('en');
        expect(comp.indicators).toHaveProperty('nl');
        expect(comp.indicators).toHaveProperty('es');
      });
    });

    it('title should be non-empty strings for all languages', () => {
      allCompetencies.forEach(comp => {
        expect(typeof comp.title.en).toBe('string');
        expect(comp.title.en.length).toBeGreaterThan(0);
        expect(typeof comp.title.nl).toBe('string');
        expect(comp.title.nl.length).toBeGreaterThan(0);
        expect(typeof comp.title.es).toBe('string');
        expect(comp.title.es.length).toBeGreaterThan(0);
      });
    });

    it('indicators should be arrays with at least one item', () => {
      allCompetencies.forEach(comp => {
        expect(Array.isArray(comp.indicators.en)).toBe(true);
        expect(comp.indicators.en.length).toBeGreaterThan(0);
        expect(Array.isArray(comp.indicators.nl)).toBe(true);
        expect(comp.indicators.nl.length).toBeGreaterThan(0);
        expect(Array.isArray(comp.indicators.es)).toBe(true);
        expect(comp.indicators.es.length).toBeGreaterThan(0);
      });
    });
  });

  describe('categories', () => {
    const allCompetencies = Object.values(competencies).flat();

    it('should have competencies in Dedicated, Entrepreneurial, and Innovative categories', () => {
      const categories = [...new Set(allCompetencies.map(c => c.category))];
      expect(categories).toContain('Dedicated');
      expect(categories).toContain('Entrepreneurial');
      expect(categories).toContain('Innovative');
    });

    it('each level should have 2 Dedicated, 2 Entrepreneurial, and 2 Innovative competencies', () => {
      Object.values(competencies).forEach(levelComps => {
        const dedicated = levelComps.filter(c => c.category === 'Dedicated');
        const entrepreneurial = levelComps.filter(c => c.category === 'Entrepreneurial');
        const innovative = levelComps.filter(c => c.category === 'Innovative');

        expect(dedicated).toHaveLength(2);
        expect(entrepreneurial).toHaveLength(2);
        expect(innovative).toHaveLength(2);
      });
    });
  });

  describe('subcategories', () => {
    const allCompetencies = Object.values(competencies).flat();

    it('should have expected subcategories', () => {
      const subcategories = [...new Set(allCompetencies.map(c => c.subcategory))];
      expect(subcategories).toContain('Result driven');
      expect(subcategories).toContain('Committed');
      expect(subcategories).toContain('Entrepreneurial');
      expect(subcategories).toContain('Ambition');
      expect(subcategories).toContain('Market oriented');
      expect(subcategories).toContain('Customer focused');
    });
  });

  describe('level A competencies', () => {
    it('should have result_driven_a as first competency', () => {
      expect(competencies.A[0].id).toBe('result_driven_a');
    });

    it('should have customer_focused_a as last competency', () => {
      expect(competencies.A[5].id).toBe('customer_focused_a');
    });
  });

  describe('level B competencies', () => {
    it('should have result_driven_b as first competency', () => {
      expect(competencies.B[0].id).toBe('result_driven_b');
    });
  });

  describe('level C competencies', () => {
    it('should have result_driven_c as first competency', () => {
      expect(competencies.C[0].id).toBe('result_driven_c');
    });
  });

  describe('level D competencies', () => {
    it('should have result_driven_d as first competency', () => {
      expect(competencies.D[0].id).toBe('result_driven_d');
    });
  });
});

describe('levelDescriptions', () => {
  it('should have all 4 levels', () => {
    expect(levelDescriptions).toHaveProperty('A');
    expect(levelDescriptions).toHaveProperty('B');
    expect(levelDescriptions).toHaveProperty('C');
    expect(levelDescriptions).toHaveProperty('D');
  });

  it('each level description should have all 3 languages', () => {
    ['A', 'B', 'C', 'D'].forEach(level => {
      expect(levelDescriptions[level]).toHaveProperty('en');
      expect(levelDescriptions[level]).toHaveProperty('nl');
      expect(levelDescriptions[level]).toHaveProperty('es');
    });
  });

  it('level A should be Entry level', () => {
    expect(levelDescriptions.A.en).toContain('Entry level');
  });

  it('level B should be Professional level', () => {
    expect(levelDescriptions.B.en).toContain('Professional level');
  });

  it('level C should be Senior level', () => {
    expect(levelDescriptions.C.en).toContain('Senior level');
  });

  it('level D should be Leadership level', () => {
    expect(levelDescriptions.D.en).toContain('Leadership level');
  });
});
