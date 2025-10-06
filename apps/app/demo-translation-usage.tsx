/**
 * Demo component showing the enhanced translation system usage
 * This demonstrates the safe translation access and type safety features
 */

'use client';

import { useTranslations } from '@/hooks/use-translation';

export function TranslationDemo() {
  const { t, tSafe, hasTranslation, getAvailableKeys, locale } = useTranslations();

  return (
    <div className='space-y-4 p-4'>
      <h2>Translation System Demo</h2>
      <p>Current locale: {locale}</p>

      {/* Safe translation access */}
      <div>
        <h3>Safe Translation Access:</h3>
        <p>Valid key: {t('common.title')}</p>
        <p>Invalid key with fallback: {t('invalid.key', 'Fallback text')}</p>
        <p>Invalid key without fallback: {t('another.invalid.key')}</p>
      </div>

      {/* Type-safe translation access */}
      <div>
        <h3>Type-Safe Translation Access:</h3>
        <p>Equipment computer: {tSafe('common.categories.equipment.computer')}</p>
        <p>Add expense action: {tSafe('expenses.actions.add-expense')}</p>
      </div>

      {/* Translation existence check */}
      <div>
        <h3>Translation Existence Check:</h3>
        <p>common.title exists: {hasTranslation('common.title').toString()}</p>
        <p>invalid.key exists: {hasTranslation('invalid.key').toString()}</p>
      </div>

      {/* Available keys (first 10 for demo) */}
      <div>
        <h3>Available Translation Keys (first 10):</h3>
        <ul>
          {getAvailableKeys().slice(0, 10).map(key => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}