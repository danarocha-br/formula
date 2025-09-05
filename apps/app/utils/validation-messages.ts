

/**
 * Utility functions for creating translated Zod validation messages
 */

export interface ValidationMessageOptions {
  min?: number;
  max?: number;
  length?: number;
  field?: string;
}

/**
 * Creates a validation message function that uses translations
 */
export function createValidationMessages(t: (key: string, fallback?: string) => string) {
  return {
    required: (field?: string) =>
      field ? `${field} ${t('forms.validation.required', 'is required').toLowerCase()}` : t('forms.validation.required', 'This field is required'),

    invalidType: (expectedType?: string) =>
      expectedType ? `${t('forms.validation.invalidType', 'Invalid input type')} (${expectedType})` : t('forms.validation.invalidType', 'Invalid input type'),

    minLength: (min: number, field?: string) =>
      field ? `${field} ${t('forms.validation.minLength', 'minimum length not met')} (${min})` : `${t('forms.validation.minLength', 'Minimum length not met')} (${min})`,

    maxLength: (max: number, field?: string) =>
      field ? `${field} ${t('forms.validation.maxLength', 'maximum length exceeded')} (${max})` : `${t('forms.validation.maxLength', 'Maximum length exceeded')} (${max})`,

    min: (min: number, field?: string) =>
      field ? `${field} ${t('forms.validation.min', 'value is too small')} (${min})` : `${t('forms.validation.min', 'Value is too small')} (${min})`,

    max: (max: number, field?: string) =>
      field ? `${field} ${t('forms.validation.max', 'value is too large')} (${max})` : `${t('forms.validation.max', 'Value is too large')} (${max})`,

    email: () => t('forms.validation.email', 'Please enter a valid email address'),
    url: () => t('forms.validation.url', 'Please enter a valid URL'),
    number: () => t('forms.validation.number', 'Please enter a valid number'),
    integer: () => t('forms.validation.integer', 'Please enter a whole number'),
    positive: () => t('forms.validation.positive', 'Value must be positive'),
    negative: () => t('forms.validation.negative', 'Value must be negative'),
    date: () => t('forms.validation.date', 'Please enter a valid date'),
    string: () => t('forms.validation.string', 'Please enter text'),
    select: () => t('forms.validation.select', 'Please select an option'),
    custom: (message?: string) => message || t('forms.validation.custom', 'Invalid value'),
  };
}

/**
 * Common Zod error map for translated messages
 */
export function createZodErrorMap(t: (key: string, fallback?: string) => string) {
  const messages = createValidationMessages(t);

  return (issue: any, ctx: any) => {
    switch (issue.code) {
      case 'invalid_type':
        if (issue.expected === 'string') return { message: messages.string() };
        if (issue.expected === 'number') return { message: messages.number() };
        if (issue.expected === 'date') return { message: messages.date() };
        return { message: messages.invalidType(issue.expected) };

      case 'too_small':
        if (issue.type === 'string') return { message: messages.minLength(issue.minimum) };
        if (issue.type === 'number') return { message: messages.min(issue.minimum) };
        return { message: messages.min(issue.minimum) };

      case 'too_big':
        if (issue.type === 'string') return { message: messages.maxLength(issue.maximum) };
        if (issue.type === 'number') return { message: messages.max(issue.maximum) };
        return { message: messages.max(issue.maximum) };

      case 'invalid_string':
        if (issue.validation === 'email') return { message: messages.email() };
        if (issue.validation === 'url') return { message: messages.url() };
        return { message: messages.string() };

      case 'custom':
        return { message: messages.custom(issue.message) };

      default:
        return { message: messages.custom() };
    }
  };
}