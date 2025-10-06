import { describe, it, expect } from 'vitest';

describe('DataTable Memoization Optimization', () => {
  it('should include stable callback dependencies in dataTable useMemo', () => {
    // Read the actual table view file to verify the optimization
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../app/features/feature-variable-cost/table-view/index.tsx');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Check that dataTable useMemo has the correct dependencies including stable callbacks
    const dataTableDependenciesMatch = fileContent.match(/}, \[data, newRows, selectedCurrency\.code, getCategoryColor, getCategoryLabel\]\);/);

    expect(dataTableDependenciesMatch).toBeTruthy();

    // Verify that the entire dataTable useMemo block includes the stable callback dependencies
    const dataTableUseMemoMatch = fileContent.match(/const dataTable = useMemo\([\s\S]*?}, \[data, newRows, selectedCurrency\.code, getCategoryColor, getCategoryLabel\]\);/);

    expect(dataTableUseMemoMatch).toBeTruthy();

    if (dataTableUseMemoMatch) {
      const useMemoContent = dataTableUseMemoMatch[0];

      // Verify that stable callback dependencies are included in the dependency array
      expect(useMemoContent).toContain('getCategoryColor, getCategoryLabel');

      // Verify that all necessary dependencies are included
      expect(useMemoContent).toContain('[data, newRows, selectedCurrency.code, getCategoryColor, getCategoryLabel]');
    }
  });

  it('should use parent callback functions instead of internal duplicates', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../app/features/feature-variable-cost/table-view/index.tsx');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Check that internal category resolution functions are NOT defined inside the useMemo callback
    expect(fileContent).not.toContain('const getCategoryColorInternal = (category: string) => {');
    expect(fileContent).not.toContain('const getCategoryLabelInternal = (category: string) => {');

    // Verify that the parent callback functions are used directly
    expect(fileContent).toContain('getCategoryColor: (category: string) => string;');
    expect(fileContent).toContain('getCategoryLabel: (category: string) => string;');
  });

  it('should use parent callback functions in data mapping', () => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, '../../app/features/feature-variable-cost/table-view/index.tsx');
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Check that the data mapping uses the parent callback functions
    expect(fileContent).toContain('categoryLabel: getCategoryLabel(item.category)');
    expect(fileContent).toContain('categoryColor: getCategoryColor(item.category)');
  });
});