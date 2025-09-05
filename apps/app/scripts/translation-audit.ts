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

interface HardcodedString {
  text: string;
  file: string;
  line: number;
  context: string;
  type: 'jsx-text' | 'string-literal' | 'template-literal' | 'aria-label' | 'placeholder';
  confidence: 'high' | 'medium' | 'low';
}

interface AuditReport {
  summary: {
    totalFiles: number;
    totalUsages: number;
    totalKeys: number;
    missingKeys: number;
    inconsistentUsage: number;
    hardcodedStrings: number;
  };
  availableKeys: {
    en: string[];
    'pt-BR': string[];
    common: string[];
  };
  usedKeys: string[];
  missingKeys: MissingKey[];
  inconsistentUsage: TranslationUsage[];
  hardcodedStrings: HardcodedString[];
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
 * Scan a file for hardcoded strings that should be translated
 */
function scanFileForHardcodedStrings(filePath: string): HardcodedString[] {
  const hardcodedStrings: HardcodedString[] = [];

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      // Skip lines that are comments, imports, or contain translation calls
      if (
        line.trim().startsWith('//') ||
        line.trim().startsWith('/*') ||
        line.trim().startsWith('*') ||
        line.includes('import ') ||
        line.includes('export ') ||
        line.includes('console.') ||
        line.includes('.log(') ||
        line.includes('.error(') ||
        line.includes('.warn(') ||
        line.includes('.debug(') ||
        line.includes('t(') ||
        line.includes('tSafe(') ||
        line.includes('getTranslations()')
      ) {
        return;
      }

      // Pattern 1: JSX text content (between > and <)
      const jsxTextPattern = />([^<>{}\n]+)</g;
      let match;

      while ((match = jsxTextPattern.exec(line)) !== null) {
        const text = match[1].trim();
        if (text && isLikelyUserFacingText(text)) {
          hardcodedStrings.push({
            text,
            file: filePath,
            line: index + 1,
            context: line.trim(),
            type: 'jsx-text',
            confidence: getConfidenceLevel(text, 'jsx-text')
          });
        }
      }

      // Pattern 2: aria-label attributes
      const ariaLabelPattern = /aria-label\s*=\s*['"`]([^'"`]+)['"`]/g;

      while ((match = ariaLabelPattern.exec(line)) !== null) {
        const text = match[1];
        if (isLikelyUserFacingText(text)) {
          hardcodedStrings.push({
            text,
            file: filePath,
            line: index + 1,
            context: line.trim(),
            type: 'aria-label',
            confidence: 'high'
          });
        }
      }

      // Pattern 3: placeholder attributes
      const placeholderPattern = /placeholder\s*=\s*['"`]([^'"`]+)['"`]/g;

      while ((match = placeholderPattern.exec(line)) !== null) {
        const text = match[1];
        if (isLikelyUserFacingText(text)) {
          hardcodedStrings.push({
            text,
            file: filePath,
            line: index + 1,
            context: line.trim(),
            type: 'placeholder',
            confidence: 'high'
          });
        }
      }

      // Pattern 4: String literals that look like user-facing text
      const stringLiteralPattern = /['"`]([^'"`\n]{3,})['"`]/g;

      while ((match = stringLiteralPattern.exec(line)) !== null) {
        const text = match[1];
        if (
          isLikelyUserFacingText(text) &&
          !line.includes('aria-label') &&
          !line.includes('placeholder') &&
          !line.includes('className') &&
          !line.includes('data-') &&
          !line.includes('key=') &&
          !line.includes('id=') &&
          !line.includes('name=') &&
          !line.includes('type=') &&
          !line.includes('role=') &&
          !line.includes('href=') &&
          !line.includes('src=') &&
          !line.includes('alt=') &&
          !isUrl(text) &&
          !isClassName(text) &&
          !isVariableName(text)
        ) {
          hardcodedStrings.push({
            text,
            file: filePath,
            line: index + 1,
            context: line.trim(),
            type: 'string-literal',
            confidence: getConfidenceLevel(text, 'string-literal')
          });
        }
      }

      // Pattern 5: Template literals with user-facing text
      const templateLiteralPattern = /`([^`\n]{3,})`/g;

      while ((match = templateLiteralPattern.exec(line)) !== null) {
        const text = match[1];
        if (
          isLikelyUserFacingText(text) &&
          !text.includes('${') && // Skip template literals with variables for now
          !isUrl(text) &&
          !isClassName(text)
        ) {
          hardcodedStrings.push({
            text,
            file: filePath,
            line: index + 1,
            context: line.trim(),
            type: 'template-literal',
            confidence: getConfidenceLevel(text, 'template-literal')
          });
        }
      }
    });
  } catch (error) {
    console.warn(`Warning: Could not read file ${filePath}:`, error);
  }

  return hardcodedStrings;
}

/**
 * Determine if a string is likely user-facing text
 */
function isLikelyUserFacingText(text: string): boolean {
  // Skip very short strings
  if (text.length < 2) return false;

  // Skip strings that are clearly technical
  if (
    /^[a-z-]+$/.test(text) && text.length < 4 || // Short kebab-case
    /^[A-Z_]+$/.test(text) || // CONSTANT_CASE
    /^[a-zA-Z]+\d+$/.test(text) || // alphanumeric IDs
    /^\d+$/.test(text) || // Pure numbers
    /^#[0-9a-fA-F]{3,6}$/.test(text) || // Hex colors
    /^[a-f0-9-]{36}$/.test(text) || // UUIDs
    /^[a-zA-Z0-9+/=]+$/.test(text) && text.length > 20 // Base64
  ) {
    return false;
  }

  // Look for characteristics of user-facing text
  const hasSpaces = text.includes(' ');
  const hasCapitalizedWords = /\b[A-Z][a-z]/.test(text);
  const hasPunctuation = /[.!?,:;]/.test(text);
  const hasCommonWords = /\b(the|and|or|of|to|in|for|with|on|at|by|from|is|are|was|were|be|been|have|has|had|do|does|did|will|would|could|should|may|might|can|must|shall|add|edit|save|delete|cancel|close|open|search|select|enter|name|cost|date|amount|category)\b/i.test(text);

  // High confidence indicators
  if (hasSpaces && (hasCapitalizedWords || hasPunctuation || hasCommonWords)) {
    return true;
  }

  // Medium confidence indicators
  if (hasCommonWords && text.length > 3) {
    return true;
  }

  // Check for common UI text patterns
  if (
    /^(Add|Edit|Save|Delete|Cancel|Close|Open|Search|Select|Enter|Name|Cost|Date|Amount|Category|Loading|Error|Success|Warning|Info)\b/i.test(text) ||
    /\b(required|optional|invalid|valid|minimum|maximum|characters?|items?|selected|available)\b/i.test(text)
  ) {
    return true;
  }

  return false;
}

/**
 * Get confidence level for hardcoded string detection
 */
function getConfidenceLevel(text: string, type: string): 'high' | 'medium' | 'low' {
  if (type === 'aria-label' || type === 'placeholder') {
    return 'high';
  }

  if (type === 'jsx-text') {
    // JSX text is usually user-facing
    return text.includes(' ') ? 'high' : 'medium';
  }

  // For string literals and template literals
  const hasSpaces = text.includes(' ');
  const hasCapitalizedWords = /\b[A-Z][a-z]/.test(text);
  const hasPunctuation = /[.!?,:;]/.test(text);
  const hasCommonWords = /\b(add|edit|save|delete|cancel|close|open|search|select|enter|name|cost|date|amount|category|loading|error|success|warning|info|required|optional)\b/i.test(text);

  if (hasSpaces && hasCapitalizedWords && (hasPunctuation || hasCommonWords)) {
    return 'high';
  }

  if (hasCommonWords || (hasSpaces && hasCapitalizedWords)) {
    return 'medium';
  }

  return 'low';
}

/**
 * Check if a string is a URL
 */
function isUrl(text: string): boolean {
  return /^https?:\/\//.test(text) || /^\/[a-zA-Z0-9/_-]*$/.test(text);
}

/**
 * Check if a string is a CSS class name
 */
function isClassName(text: string): boolean {
  return /^[a-z-]+(\s+[a-z-]+)*$/.test(text) && !text.includes(' ') ||
         /^[a-zA-Z0-9_-]+$/.test(text) && text.length < 20;
}

/**
 * Check if a string is a variable name
 */
function isVariableName(text: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(text) && text.length < 20;
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

  // Hardcoded strings recommendations
  if (report.hardcodedStrings.length > 0) {
    const highConfidence = report.hardcodedStrings.filter(h => h.confidence === 'high').length;
    const mediumConfidence = report.hardcodedStrings.filter(h => h.confidence === 'medium').length;

    recommendations.push(
      `🟠 Found ${report.hardcodedStrings.length} potential hardcoded strings (${highConfidence} high confidence, ${mediumConfidence} medium confidence). Consider replacing with translation keys.`
    );
  }

  // Inconsistent usage recommendations
  if (report.inconsistentUsage.length > 0) {
    recommendations.push(
      `🟡 Found ${report.inconsistentUsage.length} instances of inconsistent translation usage. Consider using useTranslations() hook consistently.`
    );
  }

  // Coverage recommendations
  const totalIssues = report.missingKeys.length + report.hardcodedStrings.filter(h => h.confidence === 'high').length;
  const totalPossibleKeys = report.usedKeys.length + report.hardcodedStrings.filter(h => h.confidence === 'high').length;

  if (totalPossibleKeys > 0) {
    const coveragePercentage = Math.round(
      ((totalPossibleKeys - totalIssues) / totalPossibleKeys) * 100
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
  }

  // Best practices
  recommendations.push(
    `💡 Best Practice: Use the useTranslations() hook in React components and getTranslations() only in server-side code.`
  );

  recommendations.push(
    `🔧 Consider implementing translation key validation in your CI/CD pipeline to catch missing keys early.`
  );

  if (report.hardcodedStrings.length > 0) {
    recommendations.push(
      `🎯 Focus on high-confidence hardcoded strings first, as these are most likely to be user-facing text.`
    );
  }

  return recommendations;
}

/**
 * Main audit function
 */
function auditTranslations(): AuditReport {
  console.log('🔍 Starting translation audit...\n');

  // Extract available keys from locale files
  const enKeys = extractTranslationKeys(en);
  const ptBrKeys = extractTranslationKeys(ptBR);
  const commonKeys = enKeys.filter(key => ptBrKeys.includes(key));

  console.log(`📚 Available translation keys:`);
  console.log(`   English: ${enKeys.length} keys`);
  console.log(`   Portuguese (BR): ${ptBrKeys.length} keys`);
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
  const allHardcodedStrings: HardcodedString[] = [];

  for (const file of allFiles) {
    const usages = scanFileForTranslations(file);
    allUsages.push(...usages);

    const hardcodedStrings = scanFileForHardcodedStrings(file);
    allHardcodedStrings.push(...hardcodedStrings);
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
      inconsistentUsage: inconsistentUsage.length,
      hardcodedStrings: allHardcodedStrings.length
    },
    availableKeys: {
      en: enKeys,
      'pt-BR': ptBrKeys,
      common: commonKeys
    },
    usedKeys,
    missingKeys,
    inconsistentUsage,
    hardcodedStrings: allHardcodedStrings,
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
  console.log(`Hardcoded strings: ${report.summary.hardcodedStrings}`);
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

  // Hardcoded strings
  if (report.hardcodedStrings.length > 0) {
    console.log('🟠 HARDCODED STRINGS DETECTED');
    console.log('-'.repeat(30));

    const groupedByConfidence = report.hardcodedStrings.reduce((acc, hardcoded) => {
      if (!acc[hardcoded.confidence]) acc[hardcoded.confidence] = [];
      acc[hardcoded.confidence].push(hardcoded);
      return acc;
    }, {} as Record<string, HardcodedString[]>);

    // Show high confidence first
    for (const confidence of ['high', 'medium', 'low'] as const) {
      const strings = groupedByConfidence[confidence];
      if (!strings || strings.length === 0) continue;

      console.log(`\n🎯 ${confidence.toUpperCase()} CONFIDENCE (${strings.length} instances):`);

      const groupedByType = strings.reduce((acc, hardcoded) => {
        if (!acc[hardcoded.type]) acc[hardcoded.type] = [];
        acc[hardcoded.type].push(hardcoded);
        return acc;
      }, {} as Record<string, HardcodedString[]>);

      for (const [type, typeStrings] of Object.entries(groupedByType)) {
        console.log(`\n   ${type.toUpperCase()}:`);

        for (const hardcoded of typeStrings.slice(0, 5)) { // Show first 5
          console.log(`     - "${hardcoded.text}" at ${hardcoded.file}:${hardcoded.line}`);
        }

        if (typeStrings.length > 5) {
          console.log(`     ... and ${typeStrings.length - 5} more`);
        }
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
    const highConfidenceHardcoded = report.hardcodedStrings.filter(h => h.confidence === 'high').length;

    if (report.summary.missingKeys > 0 || highConfidenceHardcoded > 0) {
      console.log('\n❌ Audit completed with issues. Please fix missing translation keys and high-confidence hardcoded strings.');
      process.exit(1);
    } else if (report.hardcodedStrings.length > 0) {
      console.log('\n⚠️  Audit completed with warnings. Consider reviewing medium/low confidence hardcoded strings.');
      process.exit(0);
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