import type { TranslationStructure } from '@/types/translations';

/**
 * Utility functions for handling API errors with translations
 */

export interface ApiError {
  status?: number;
  code?: string;
  message?: string;
  type?: 'network' | 'server' | 'validation' | 'auth' | 'client';
}

/**
 * Maps HTTP status codes to translation keys
 */
export function getErrorTranslationKey(error: ApiError): keyof TranslationStructure['validation']['error'] {
  // Handle specific error codes first
  if (error.code) {
    switch (error.code) {
      case 'NETWORK_ERROR':
      case 'FETCH_ERROR':
        return 'network-error';
      case 'TIMEOUT':
        return 'timeout';
      case 'VALIDATION_ERROR':
        return 'validation-failed';
      case 'DUPLICATE':
        return 'duplicate';
      case 'RATE_LIMIT':
        return 'rate-limit';
      case 'MAINTENANCE':
        return 'maintenance';
      default:
        break;
    }
  }

  // Handle HTTP status codes
  if (error.status) {
    switch (error.status) {
      case 400:
        return 'validation-failed';
      case 401:
        return 'unauthorized';
      case 403:
        return 'insufficient-permissions';
      case 404:
        return 'not-found';
      case 409:
        return 'duplicate';
      case 429:
        return 'rate-limit';
      case 500:
      case 502:
      case 503:
        return 'server-error';
      case 504:
        return 'timeout';
      default:
        if (error.status >= 500) return 'server-error';
        if (error.status >= 400) return 'validation-failed';
        break;
    }
  }

  // Handle error types
  if (error.type) {
    switch (error.type) {
      case 'network':
        return 'network-error';
      case 'server':
        return 'server-error';
      case 'validation':
        return 'validation-failed';
      case 'auth':
        return 'unauthorized';
      default:
        break;
    }
  }

  // Default fallback
  return 'server-error';
}

/**
 * Gets a translated error message for an API error
 */
export function getTranslatedErrorMessage(
  error: ApiError,
  t: TranslationStructure | ((key: string, fallback?: string) => string),
  fallback?: string
): string {
  const key = getErrorTranslationKey(error);

  // Handle both translation function and translation object
  let message: string;
  if (typeof t === 'function') {
    message = t(`validation.error.${String(key)}`, fallback);
  } else {
    message = t.validation.error[key];
  }

  // If we have a custom message and it's not a generic server error, use it
  if (error.message && key !== 'server-error' && key !== 'network-error') {
    return `${message}: ${error.message}`;
  }

  return message || fallback || (typeof t === 'function' ? t('validation.error.server-error') : t.validation.error['server-error']);
}

/**
 * Creates an error handler function that uses translations
 */
export function createApiErrorHandler(t: TranslationStructure | ((key: string, fallback?: string) => string)) {
  return (error: unknown, fallbackMessage?: string): string => {
    let apiError: ApiError = {};

    if (error instanceof Error) {
      apiError.message = error.message;

      // Check if it's a fetch error
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        apiError.type = 'network';
      }
    } else if (typeof error === 'object' && error !== null) {
      // Assume it's an API error object
      apiError = error as ApiError;
    }

    return getTranslatedErrorMessage(apiError, t, fallbackMessage);
  };
}

/**
 * Common error patterns for different operations
 */
export const ErrorPatterns = {
  CREATE: (t: TranslationStructure | ((key: string, fallback?: string) => string)) => ({
    default: typeof t === 'function' ? t('validation.error.create-failed') : t.validation.error['create-failed'],
    duplicate: typeof t === 'function' ? t('validation.error.duplicate') : t.validation.error.duplicate,
    validation: typeof t === 'function' ? t('validation.error.validation-failed') : t.validation.error['validation-failed'],
    unauthorized: typeof t === 'function' ? t('validation.error.unauthorized') : t.validation.error.unauthorized,
  }),

  UPDATE: (t: TranslationStructure | ((key: string, fallback?: string) => string)) => ({
    default: typeof t === 'function' ? t('validation.error.update-failed') : t.validation.error['update-failed'],
    notFound: typeof t === 'function' ? t('validation.error.not-found') : t.validation.error['not-found'],
    validation: typeof t === 'function' ? t('validation.error.validation-failed') : t.validation.error['validation-failed'],
    unauthorized: typeof t === 'function' ? t('validation.error.unauthorized') : t.validation.error.unauthorized,
  }),

  DELETE: (t: TranslationStructure | ((key: string, fallback?: string) => string)) => ({
    default: typeof t === 'function' ? t('validation.error.delete-failed') : t.validation.error['delete-failed'],
    notFound: typeof t === 'function' ? t('validation.error.not-found') : t.validation.error['not-found'],
    unauthorized: typeof t === 'function' ? t('validation.error.unauthorized') : t.validation.error.unauthorized,
  }),

  FETCH: (t: TranslationStructure | ((key: string, fallback?: string) => string)) => ({
    default: typeof t === 'function' ? t('validation.error.server-error') : t.validation.error['server-error'],
    notFound: typeof t === 'function' ? t('validation.error.not-found') : t.validation.error['not-found'],
    network: typeof t === 'function' ? t('validation.error.network-error') : t.validation.error['network-error'],
    unauthorized: typeof t === 'function' ? t('validation.error.unauthorized') : t.validation.error.unauthorized,
  }),
} as const;