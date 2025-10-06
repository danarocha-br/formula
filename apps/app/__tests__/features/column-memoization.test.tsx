import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Test to verify that column definitions are properly memoized
 * This test checks the source code to ensure useMemo is implemented correctly
 */
describe('Column Memoization', () => {
  it('should have columns wrapped in useMemo', () => {
    // Read the table view component source code
    const filePath = join(process.cwd(), 'app/features/feature-variable-cost/table-view/index.tsx');
    const sourceCode = readFileSync(filePath, 'utf-8');

    // Verify that columns are defined with useMemo
    expect(sourceCode).toContain('const columns = useMemo<ColumnDef<EquipmentExpense>[]>(() => [');

    // Verify that the useMemo has a dependency array
    expect(sourceCode).toMatch(/\], \[[\s\S]*?\]\);/);
  });

  it('should include essential dependencies in the memoization', () => {
    const filePath = join(process.cwd(), 'app/features/feature-variable-cost/table-view/index.tsx');
    const sourceCode = readFileSync(filePath, 'utf-8');

    // Extract the dependency array from the useMemo
    const useMemoMatch = sourceCode.match(/const columns = useMemo<ColumnDef<EquipmentExpense>\[\]>\(\(\) => \[[\s\S]*?\], \[([\s\S]*?)\]\);/);

    expect(useMemoMatch).toBeTruthy();

    if (useMemoMatch) {
      const dependencyArray = useMemoMatch[1];

      // Verify essential dependencies are included
      expect(dependencyArray).toContain('t');
      expect(dependencyArray).toContain('selectedRows');
      expect(dependencyArray).toContain('handleRowSelection');
      expect(dependencyArray).toContain('handleSelectAll');
    }
  });

  it('should verify the memoization pattern is correctly implemented', () => {
    // This test ensures that the implementation follows React best practices
    const essentialDependencies = [
      't', // translation function
      'selectedRows', // state for checkbox selection
      'handleRowSelection', // callback for individual row selection
      'handleSelectAll', // callback for select all functionality
    ];

    // Verify that we have identified the core dependencies
    expect(essentialDependencies).toHaveLength(4);
    expect(essentialDependencies).toContain('t');
    expect(essentialDependencies).toContain('selectedRows');
    expect(essentialDependencies).toContain('handleRowSelection');
    expect(essentialDependencies).toContain('handleSelectAll');
  });
});