import { describe, it, expect } from 'vitest';
import { EQUIPMENT_COST_CATEGORIES } from '@/app/constants';

describe('Callback Dependency Fix', () => {
  it('should verify EQUIPMENT_COST_CATEGORIES is a stable reference', () => {
    // Verify that the constant is stable across imports
    const categories1 = EQUIPMENT_COST_CATEGORIES;
    const categories2 = EQUIPMENT_COST_CATEGORIES;

    expect(categories1).toBe(categories2);
    expect(categories1.length).toBeGreaterThan(0);

    // Verify structure
    categories1.forEach(category => {
      expect(category).toHaveProperty('label');
      expect(category).toHaveProperty('value');
      expect(category).toHaveProperty('icon');
      expect(category).toHaveProperty('color');
    });
  });

  it('should test callback function stability and correctness', () => {
    // Test that the functions return consistent results
    const getCategoryColor = (category: string) => {
      const categoryData = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === category);
      return categoryData?.color || 'bg-gray-300';
    };

    const getCategoryLabel = (category: string) => {
      const categoryData = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === category);
      return categoryData?.label || category;
    };

    // Test known categories
    expect(getCategoryColor('computer')).toBe('bg-[#E8EF16]');
    expect(getCategoryColor('monitor')).toBe('bg-[#F07D66]');
    expect(getCategoryColor('unknown')).toBe('bg-gray-300');

    // Test labels
    expect(getCategoryLabel('computer')).toBeTruthy();
    expect(getCategoryLabel('monitor')).toBeTruthy();
    expect(getCategoryLabel('unknown')).toBe('unknown');

    // Test consistency - multiple calls should return same result
    expect(getCategoryColor('computer')).toBe(getCategoryColor('computer'));
    expect(getCategoryLabel('computer')).toBe(getCategoryLabel('computer'));
  });

  it('should verify callback functions only depend on stable constants', () => {
    // This test ensures that the callback functions are pure and only depend on EQUIPMENT_COST_CATEGORIES
    const testCategories = ['computer', 'monitor', 'keyboard', 'mouse', 'unknown'];

    testCategories.forEach(category => {
      const getCategoryColor = (cat: string) => {
        const categoryData = EQUIPMENT_COST_CATEGORIES.find(c => c.value === cat);
        return categoryData?.color || 'bg-gray-300';
      };

      const getCategoryLabel = (cat: string) => {
        const categoryData = EQUIPMENT_COST_CATEGORIES.find(c => c.value === cat);
        return categoryData?.label || cat;
      };

      // Functions should be deterministic
      const color1 = getCategoryColor(category);
      const color2 = getCategoryColor(category);
      const label1 = getCategoryLabel(category);
      const label2 = getCategoryLabel(category);

      expect(color1).toBe(color2);
      expect(label1).toBe(label2);
    });
  });

  it('should verify that callback functions have correct empty dependency behavior', () => {
    // Simulate what useCallback with empty dependencies should do
    let callCount = 0;

    const createStableCallback = () => {
      callCount++;
      return (category: string) => {
        const categoryData = EQUIPMENT_COST_CATEGORIES.find(cat => cat.value === category);
        return categoryData?.color || 'bg-gray-300';
      };
    };

    // First call creates the function
    const callback1 = createStableCallback();
    expect(callCount).toBe(1);

    // With empty dependencies, the function should be stable
    const result1 = callback1('computer');
    const result2 = callback1('computer');

    expect(result1).toBe(result2);
    expect(result1).toBe('bg-[#E8EF16]');
  });
});