#!/usr/bin/env tsx

/**
 * Translation Key Audit Script
 *
 * This script scans the codebase for translation usage patterns and generates
 * a comprehensive report of translation coverage and key mismatches.
 *
 * Usage: npx tsx scripts/translation-audit.ts
 */

import { readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { extname, join } from 'path';
import { en } from '../locales/en';
import { ptBR } from '../locales/pt-BR';

// Configuration
const SCAN_DIRECTORIES = [
  'app',
  'hooks',
  'utils',
  'contexts',
  'components'
];

const FILE_EXTENSIONS = ['.ts', '.tsx'];
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  'build'
];

// Types for audit results
interface TranslationUsage {
  key: string;
  file: string;
  line: number;
  context: string;
  method: 'useTranslations' | 'getTranslations' | 'direct';
}

interface MissingKey {
  key: string;
  locales: string[];
  usages: TranslationUsage[];
}

interface AuditReport {
  summary: {
    totalFiles: number;
    totalUsages: number;
    totalKeys: number;
    missingKeys: number;
    inconsistentUsage: number;
  };
  availableKeys: {
    en: string[];
    'pt-BR': string[];
    common: string[];
  };
  usedKeys: string[];
  missingKeys: MissingKey[];
  inconsistentUsage: TranslationUsage[];
  recommendations: string[];
}

/**
 * Extract all translation keys from a translation object
 */
function extractTranslationKeys(obj: unknown, prefix = ''): string[] {
  const keys: string[] = [];

  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        keys.push(fullKey);
      } else if (typeof value === 'object' && value !== null) {
        keys.push(...extractTranslationKeys(value, fullKey));
      }
    }
  }

  return keys.sort();
}

/**
 * Scan a file for translation usage patterns
 */
function scanFileForTranslations(filePath: string): TranslationUsage[] {
  const usages: TranslationUsage[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Pattern 1: t('key') or t("key") - more flexible matching
      const tPattern = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
      let match;

      while ((match = tPattern.exec(line)) !== null) {
        usages.push({
          key: match[1],
          file: filePath,
          line: index + 1,
          context: line.trim(),
          method: 'useTranslations'
        });
      }

      // Pattern 2: tSafe('key') or tSafe("key")
      const tSafePattern = /\btSafe\s*\(\s*['"`]([^'"`]+)['"`]/g;

      while ((match = tSafePattern.exec(line)) !== null) {
        usages.push({
          key: match[1],
          file: filePath,
          line: index + 1,
          context: line.trim(),
          method: 'useTranslations'
        });
      }

      // Pattern 3: Direct object access like translations.common.title
      const directPattern = /translations\.([a-zA-Z0-9_.-]+)/g;

      while ((match = directPattern.exec(line)) !== null) {
        usages.push({
          key: match[1],
          file: filePath,
          line: index + 1,
          context: line.trim(),
          method: 'direct'
        });
      }

      // Pattern 4: getTranslations().key access
      const getTranslationsPattern = /getTranslations\(\)\.([a-zA-Z0-9_.-]+)/g;

      while ((match = getTranslationsPattern.exec(line)) !== null) {
        usages.push({
          key: match[1],
          file: filePath,
          line: index + 1,
          context: line.trim(),
          method: 'getTranslations'
        });
      }

      // Pattern 5: Variable assignment like const t = getTranslations()
      if (line.includes('getTranslations()') && !line.includes('getTranslations().')) {
        // This indicates getTranslations() usage but we need to track the variable name
        const varPattern = /const\s+(\w+)\s*=\s*getTranslations\(\)/;
        const varMatch = varPattern.exec(line);
        if (varMatch) {
          // Look for usage of this variable in the same file
          const varName = varMatch[1];
          const varUsagePattern = new RegExp(`\\b${varName}\\s*\\.([a-zA-Z0-9_.-]+)`, 'g');

          lines.forEach((otherLine, otherIndex) => {
            let varUsageMatch;
            while ((varUsageMatch = varUsagePattern.exec(otherLine)) !== null) {
              usages.push({
                key: varUsageMatch[1],
                file: filePath,
                line: otherIndex + 1,
                context: otherLine.trim(),
                method: 'getTranslations'
              });
            }
          });
        }
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
  }

  return usages;
}

/**
 * Recursively scan directory for TypeScript files
 */
function scanDirectory(dirPath: string): string[] {
  const files: string[] = [];

  try {
    const entries = readdirSync(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip excluded directories
        if (!EXCLUDE_PATTERNS.some(pattern => entry.includes(pattern))) {
          files.push(...scanDirectory(fullPath));
        }
      } else if (stat.isFile()) {
        // Include TypeScript files
        if (FILE_EXTENSIONS.includes(extname(entry))) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not scan directory ${dirPath}:`, error);
  }

  return files;
}

/**
 * Check if a translation key exists in a translation object
 */
function keyExists(obj: unknown, keyPath: string): boolean {
  const keys = keyPath.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return false;
    }
  }

  return typeof current === 'string';
}

/**
 * Generate audit recommendations
 */
function generateRecommendations(report: AuditReport): string[] {
  const recommendations: string[] = [];

  // Missing keys recommendations
  if (report.missingKeys.length > 0) {
    recommendations.push(
      `🔴 Found ${report.missingKeys.length} missing translation keys. Add these keys to your locale files.`
    );
  }

  // Inconsistent usage recommendations
  if (report.inconsistentUsage.length > 0) {
    recommendations.push(
      `🟡 Found ${report.inconsistentUsage.length} instances of inconsistent translation usage. Consider using useTranslations() hook consistently.`
    );
  }

  // Coverage recommendations
  const coveragePercentage = Math.round(
    ((report.usedKeys.length - report.missingKeys.length) / report.usedKeys.length) * 100
  );

  if (coveragePercentage < 100) {
    recommendations.push(
      `📊 Translation coverage: ${coveragePercentage}%. Aim for 100% coverage to prevent runtime errors.`
    );
  } else {
    recommendations.push(
      `✅ Excellent! 100% translation coverage achieved.`
    );
  }

  // Best practices
  recommendations.push(
    `💡 Best Practice: Use the useTranslations() hook in React components and getTranslations() only in server-side code.`
  );

  recommendations.push(
    `🔧 Consider implementing translation key validation in your CI/CD pipeline to catch missing keys early.`
  );

  return recommendations;
}

/**
 * Main audit function
 */
function auditTranslations(): AuditReport {
  console.log('🔍 Starting translation audit...\n');

  // Extract available keys from locale files
  const enKeys = extractTranslationKeys(en);
  const ptBRKeys = extractTranslationKeys(ptBR);
  const commonKeys = enKeys.filter(key => ptBRKeys.includes(key));

  console.log(`📚 Available translation keys:`);
  console.log(`   English: ${enKeys.length} keys`);
  console.log(`   Portuguese (BR): ${ptBRKeys.length} keys`);
  console.log(`   Common to both: ${commonKeys.length} keys\n`);

  // Scan files for translation usage
  const allFiles: string[] = [];
  const baseDir = process.cwd();

  for (const dir of SCAN_DIRECTORIES) {
    const dirPath = join(baseDir, dir);
    try {
      allFiles.push(...scanDirectory(dirPath));
    } catch (error) {
      console.warn(`Warning: Could not scan directory ${dir}:`, error);
    }
  }

  console.log(`📁 Scanning ${allFiles.length} files...\n`);

  // Collect all translation usages
  const allUsages: TranslationUsage[] = [];

  for (const file of allFiles) {
    const usages = scanFileForTranslations(file);
    allUsages.push(...usages);
  }

  // Analyze usages
  const usedKeys = [...new Set(allUsages.map(usage => usage.key))].sort();
  const missingKeys: MissingKey[] = [];
  const inconsistentUsage: TranslationUsage[] = [];

  // Check for missing keys
  for (const key of usedKeys) {
    const missingLocales: string[] = [];

    if (!keyExists(en, key)) {
      missingLocales.push('en');
    }

    if (!keyExists(ptBR, key)) {
      missingLocales.push('pt-BR');
    }

    if (missingLocales.length > 0) {
      missingKeys.push({
        key,
        locales: missingLocales,
        usages: allUsages.filter(usage => usage.key === key)
      });
    }
  }

  // Check for inconsistent usage patterns
  for (const usage of allUsages) {
    // Flag direct object access as inconsistent
    if (usage.method === 'direct') {
      inconsistentUsage.push(usage);
    }

    // Flag getTranslations() usage in component files (should use hook)
    if (usage.method === 'getTranslations' &&
        (usage.file.includes('/app/') || usage.file.includes('/components/')) &&
        !usage.file.includes('/server/')) {
      inconsistentUsage.push(usage);
    }
  }

  // Generate report
  const report: AuditReport = {
    summary: {
      totalFiles: allFiles.length,
      totalUsages: allUsages.length,
      totalKeys: usedKeys.length,
      missingKeys: missingKeys.length,
      inconsistentUsage: inconsistentUsage.length
    },
    availableKeys: {
      en: enKeys,
      'pt-BR': ptBRKeys,
      common: commonKeys
    },
    usedKeys,
    missingKeys,
    inconsistentUsage,
    recommendations: []
  };

  report.recommendations = generateRecommendations(report);

  return report;
}

/**
 * Format and display the audit report
 */
function displayReport(report: AuditReport): void {
  console.log('📋 TRANSLATION AUDIT REPORT');
  console.log('=' .repeat(50));
  console.log();

  // Summary
  console.log('📊 SUMMARY');
  console.log('-'.repeat(20));
  console.log(`Files scanned: ${report.summary.totalFiles}`);
  console.log(`Translation usages found: ${report.summary.totalUsages}`);
  console.log(`Unique keys used: ${report.summary.totalKeys}`);
  console.log(`Missing keys: ${report.summary.missingKeys}`);
  console.log(`Inconsistent usage: ${report.summary.inconsistentUsage}`);
  console.log();

  // Missing keys
  if (report.missingKeys.length > 0) {
    console.log('🔴 MISSING TRANSLATION KEYS');
    console.log('-'.repeat(30));

    for (const missing of report.missingKeys) {
      console.log(`\n❌ Key: "${missing.key}"`);
      console.log(`   Missing in: ${missing.locales.join(', ')}`);
      console.log(`   Used in ${missing.usages.length} place(s):`);

      for (const usage of missing.usages.slice(0, 3)) { // Show first 3 usages
        console.log(`     - ${usage.file}:${usage.line}`);
      }

      if (missing.usages.length > 3) {
        console.log(`     ... and ${missing.usages.length - 3} more`);
      }
    }
    console.log();
  }

  // Inconsistent usage
  if (report.inconsistentUsage.length > 0) {
    console.log('🟡 INCONSISTENT USAGE PATTERNS');
    console.log('-'.repeat(35));

    const groupedByType = report.inconsistentUsage.reduce((acc, usage) => {
      const type = usage.method === 'direct' ? 'Direct object access' : 'getTranslations() in components';
      if (!acc[type]) acc[type] = [];
      acc[type].push(usage);
      return acc;
    }, {} as Record<string, TranslationUsage[]>);

    for (const [type, usages] of Object.entries(groupedByType)) {
      console.log(`\n⚠️  ${type} (${usages.length} instances):`);

      for (const usage of usages.slice(0, 5)) { // Show first 5
        console.log(`   - ${usage.file}:${usage.line} - "${usage.key}"`);
      }

      if (usages.length > 5) {
        console.log(`   ... and ${usages.length - 5} more`);
      }
    }
    console.log();
  }

  // Recommendations
  console.log('💡 RECOMMENDATIONS');
  console.log('-'.repeat(20));
  for (const recommendation of report.recommendations) {
    console.log(recommendation);
  }
  console.log();

  // Key coverage by category
  console.log('📈 KEY COVERAGE BY CATEGORY');
  console.log('-'.repeat(30));

  const keysByCategory = report.usedKeys.reduce((acc, key) => {
    const category = key.split('.')[0];
    if (!acc[category]) acc[category] = [];
    acc[category].push(key);
    return acc;
  }, {} as Record<string, string[]>);

  for (const [category, keys] of Object.entries(keysByCategory)) {
    const missingInCategory = report.missingKeys.filter(mk => mk.key.startsWith(category + '.')).length;
    const coverage = Math.round(((keys.length - missingInCategory) / keys.length) * 100);
    console.log(`${category}: ${keys.length} keys, ${coverage}% coverage`);
  }
}

/**
 * Save report to JSON file
 */
function saveReportToFile(report: AuditReport): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `translation-audit-${timestamp}.json`;
  const filepath = join(process.cwd(), 'reports', filename);

  try {
    // Ensure reports directory exists
    const reportsDir = join(process.cwd(), 'reports');
    try {
      readdirSync(reportsDir);
    } catch {
      // Directory doesn't exist, but we'll let writeFileSync handle it
    }

    writeFileSync(filepath, JSON.stringify(report, null, 2));
    console.log(`📄 Detailed report saved to: ${filename}`);
  } catch (error) {
    console.warn('Warning: Could not save report to file:', error);
  }
}

// Main execution
if (require.main === module) {
  try {
    const report = auditTranslations();
    displayReport(report);
    saveReportToFile(report);

    // Exit with error code if there are issues
    if (report.summary.missingKeys > 0) {
      console.log('\n❌ Audit completed with errors. Please fix missing translation keys.');
      process.exit(1);
    } else {
      console.log('\n✅ Audit completed successfully!');
      process.exit(0);
    }
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

export { auditTranslations, type AuditReport };