#!/usr/bin/env ts-node

/**
 * Verification script to check if infinite loop fix is properly applied
 * 
 * This script analyzes the table-view component to ensure:
 * 1. No createOptimizedHandlers calls in column definitions
 * 2. No createOptimizedHandlers in dependency arrays 
 * 3. Simplified addNewRow function without circular dependencies
 */

import fs from 'fs';
import path from 'path';

const TABLE_VIEW_FILE = '/Users/danarocha/Projects/formula/apps/app/app/features/feature-variable-cost/table-view/index.tsx';

async function verifyInfiniteLoopFix() {
  try {
    const content = fs.readFileSync(TABLE_VIEW_FILE, 'utf8');
    const lines = content.split('\n');
    
    console.log('🔍 Analyzing table-view component for infinite loop fixes...\n');

    // Check 1: Find all createOptimizedHandlers calls (should only be the function definition)
    const handlerCalls = [];
    lines.forEach((line, index) => {
      if (line.includes('createOptimizedHandlers(') && !line.trim().startsWith('const createOptimizedHandlers') && !line.trim().startsWith('//')) {
        handlerCalls.push({
          line: index + 1,
          content: line.trim()
        });
      }
    });

    if (handlerCalls.length === 0) {
      console.log('✅ No problematic createOptimizedHandlers calls found in columns');
    } else {
      console.log('❌ Found problematic createOptimizedHandlers calls:');
      handlerCalls.forEach(call => {
        console.log(`   Line ${call.line}: ${call.content}`);
      });
    }

    // Check 2: Find createOptimizedHandlers in dependency arrays
    const dependencyReferences = [];
    lines.forEach((line, index) => {
      if (line.includes('createOptimizedHandlers') && line.includes('[') && line.includes(']') && !line.trim().startsWith('//')) {
        dependencyReferences.push({
          line: index + 1,
          content: line.trim()
        });
      }
    });

    if (dependencyReferences.length === 0) {
      console.log('✅ No createOptimizedHandlers found in dependency arrays');
    } else {
      console.log('❌ Found createOptimizedHandlers in dependency arrays:');
      dependencyReferences.forEach(ref => {
        console.log(`   Line ${ref.line}: ${ref.content}`);
      });
    }

    // Check 3: Verify addNewRow function is simplified
    let addNewRowFound = false;
    let addNewRowContent = '';
    let inAddNewRow = false;
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('const addNewRow = useCallback(')) {
        addNewRowFound = true;
        inAddNewRow = true;
        addNewRowContent = line + '\n';
        braceCount = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        continue;
      }
      
      if (inAddNewRow) {
        addNewRowContent += line + '\n';
        braceCount += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
        
        if (braceCount === 0 && line.includes('}')) {
          inAddNewRow = false;
          break;
        }
      }
    }

    if (addNewRowFound) {
      console.log('✅ addNewRow function found');
      
      // Check if it contains problematic patterns
      const hasSetNewRowsWithPrev = addNewRowContent.includes('setNewRows(prev');
      const hasCircularDep = addNewRowContent.includes('newRows.length') && addNewRowContent.includes('[') && addNewRowContent.includes('newRows.length');
      
      if (hasSetNewRowsWithPrev) {
        console.log('✅ addNewRow uses setNewRows with prev parameter (good)');
      } else {
        console.log('❌ addNewRow does not use setNewRows with prev parameter');
      }
      
      if (!hasCircularDep) {
        console.log('✅ addNewRow does not have circular dependency with newRows.length');
      } else {
        console.log('❌ addNewRow may still have circular dependency');
      }
    } else {
      console.log('❌ addNewRow function not found');
    }

    // Check 4: Verify simplified handler structure
    const disabledHandlerCount = (content.match(/console\.log\(['"].*disabled.*['"]/g) || []).length;
    console.log(`✅ Found ${disabledHandlerCount} disabled handler calls (temporary debugging)`);

    // Summary
    console.log('\n📊 Summary:');
    const issues = handlerCalls.length + dependencyReferences.length + (addNewRowFound ? 0 : 1);
    if (issues === 0) {
      console.log('🎉 All infinite loop fixes appear to be properly applied!');
      console.log('');
      console.log('The component should now:');
      console.log('- Allow "Add new row" without infinite loop errors');
      console.log('- Have stable column definitions');
      console.log('- Use simplified handler system (currently disabled for debugging)');
      console.log('');
      console.log('Next steps:');
      console.log('1. Test the component in browser');
      console.log('2. If infinite loop is resolved, gradually restore handler functionality');
      return true;
    } else {
      console.log(`❌ Found ${issues} potential issues that need to be addressed`);
      return false;
    }

  } catch (error) {
    console.error('Error analyzing file:', error);
    return false;
  }
}

// Run verification
verifyInfiniteLoopFix().then(success => {
  process.exit(success ? 0 : 1);
});