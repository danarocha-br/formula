import { describe, it, expect } from 'vitest';
import {
  getCategoryLabel,
  getCategoryColor,
  getCategoryIcon,
  createEquipmentCategoryOptions,
  createCategoryOption,
  getEquipmentCategoryValues,
  isValidEquipmentCategory,
} from '../category-utils';

describe('category-utils', () => {
  describe('getCategoryLabel', () => {
    it('should return correct label for valid category', () => {
      // Note: These tests depend on the actual EQUIPMENT_COST_CATEGORIES data
      // The exact labels will depend on the translation system
      const label = getCategoryLabel('computer');
      expect(typeof label).toBe('string');
      expect(label.length).toBeGreaterThan(0);
    });

    it('should return the category value for unknown category', () => {
      const result = getCategoryLabel('unknown-category');
      expect(result).toBe('unknown-category');
    });
  });

  describe('getCategoryColor', () => {
    it('should return color class for valid category', () => {
      const color = getCategoryColor('computer');
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^bg-/); // Should start with 'bg-'
    });

    it('should return default color for unknown category', () => {
      const result = getCategoryColor('unknown-category');
      expect(result).toBe('bg-gray-300');
    });
  });

  describe('getCategoryIcon', () => {
    it('should return icon name for valid category', () => {
      const icon = getCategoryIcon('computer');
      expect(typeof icon).toBe('string');
      expect(icon.length).toBeGreaterThan(0);
    });

    it('should return default icon for unknown category', () => {
      const result = getCategoryIcon('unknown-category');
      expect(result).toBe('other');
    });
  });

  describe('createEquipmentCategoryOptions', () => {
    it('should create array of category options', () => {
      const options = createEquipmentCategoryOptions();

      expect(Array.isArray(options)).toBe(true);
      expect(options.length).toBeGreaterThan(0);

      // Check structure of first option
      const firstOption = options[0];
      expect(firstOption).toHaveProperty('label');
      expect(firstOption).toHaveProperty('value');
      expect(firstOption).toHaveProperty('slot');
      expect(typeof firstOption.label).toBe('string');
      expect(typeof firstOption.value).toBe('string');
    });

    it('should have unique values', () => {
      const options = createEquipmentCategoryOptions();
      const values = options.map(option => option.value);
      const uniqueValues = [...new Set(values)];

      expect(values.length).toBe(uniqueValues.length);
    });
  });

  describe('createCategoryOption', () => {
    it('should create option for valid category', () => {
      const option = createCategoryOption('computer');

      expect(option).toBeDefined();
      expect(option).toHaveProperty('label');
      expect(option).toHaveProperty('value');
      expect(option).toHaveProperty('slot');
      expect(option?.value).toBe('computer');
    });

    it('should return undefined for invalid category', () => {
      const option = createCategoryOption('invalid-category');
      expect(option).toBeUndefined();
    });
  });

  describe('getEquipmentCategoryValues', () => {
    it('should return array of category values', () => {
      const values = getEquipmentCategoryValues();

      expect(Array.isArray(values)).toBe(true);
      expect(values.length).toBeGreaterThan(0);
      expect(values.every(value => typeof value === 'string')).toBe(true);
    });

    it('should include common categories', () => {
      const values = getEquipmentCategoryValues();

      // These should exist based on the constants file
      expect(values).toContain('computer');
      expect(values).toContain('monitor');
      expect(values).toContain('other');
    });
  });

  describe('isValidEquipmentCategory', () => {
    it('should return true for valid categories', () => {
      expect(isValidEquipmentCategory('computer')).toBe(true);
      expect(isValidEquipmentCategory('monitor')).toBe(true);
      expect(isValidEquipmentCategory('other')).toBe(true);
    });

    it('should return false for invalid categories', () => {
      expect(isValidEquipmentCategory('invalid-category')).toBe(false);
      expect(isValidEquipmentCategory('')).toBe(false);
      expect(isValidEquipmentCategory('COMPUTER')).toBe(false); // Case sensitive
    });
  });
});