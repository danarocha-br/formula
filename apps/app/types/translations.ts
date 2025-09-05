/**
 * Comprehensive TypeScript interfaces for translation structure
 * This provides compile-time type safety for translation keys
 */

// Common actions translations
export interface CommonActionsTranslations {
  add: string;
  save: string;
  cancel: string;
  close: string;
  open: string;
}

// Common labels translations
export interface CommonLabelsTranslations {
  name: string;
  cost: string;
  category: string;
  date: string;
  lifespan: string;
  usage: string;
  amount: string;
}

// Common placeholders translations
export interface CommonPlaceholdersTranslations {
  enterName: string;
  selectCategory: string;
  search: string;
}

// Common accessibility translations
export interface CommonAccessibilityTranslations {
  openSettings: string;
  openMenu: string;
  closeMenu: string;
  showBillablePanel: string;
  hideBillablePanel: string;
  selectLanguage: string;
  selectCurrency: string;
  selectCategory: string;
  toggleLanguage: string;
  navigationMenu: string;
  gridView: string;
  tableView: string;
  nodeView: string;
  chartView: string;
  deleteItem: string;
  addItem: string;
  editItem: string;
  alert: string;
}

// Common translation types
export interface CommonTranslations {
  title: string;
  description: string;
  currency: string;
  'currency-symbol': string;
  'not-found': string;
  search: string;
  delete: string;
  edit: string;
  actions: CommonActionsTranslations;
  labels: CommonLabelsTranslations;
  placeholders: CommonPlaceholdersTranslations;
  accessibility: CommonAccessibilityTranslations;
  categories: {
    'fixed-cost': FixedCostCategories;
    equipment: EquipmentCategories;
  };
  period: {
    'per-month': string;
    'per-year': string;
    monthly: string;
    yearly: string;
    months: string;
    years: string;
  };
}

// Fixed cost category translations
export interface FixedCostCategories {
  rent: string;
  utilities: string;
  electricity: string;
  internet: string;
  insurance: string;
  subscriptions: string;
  cloud: string;
  transport: string;
  domain: string;
  tools: string;
  accounting: string;
  banking: string;
  marketing: string;
  courses: string;
  other: string;
}

// Equipment category translations
export interface EquipmentCategories {
  computer: string;
  phone: string;
  tablet: string;
  monitor: string;
  keyboard: string;
  mouse: string;
  printer: string;
  camera: string;
  headphones: string;
  speakers: string;
  hd: string;
  other: string;
}

// Navigation translations
export interface NavigationTranslations {
  'top-level': {
    'hourly-rate': string;
    'project-rate': string;
  };
  'bottom-level': {
    'fixed-cost': string;
    'variable-cost': string;
    'equipment-cost': string;
  };
}

// Expense form translations
export interface ExpenseFormTranslations {
  category: string;
  name: string;
  value: string;
  period: string;
}

// Expense actions translations
export interface ExpenseActionsTranslations {
  'add-expense': string;
  'edit-expense': string;
}

// Billable cost form translations
export interface BillableFormTranslations {
  'work-days': string;
  'work-days-period': string;
  'billable-hours': string;
  'billable-hours-period': string;
  holidays: string;
  'holidays-period': string;
  vacations: string;
  'vacations-period': string;
  'sick-leave': string;
  'sick-leave-period': string;
  'monthly-salary': string;
  'monthly-salary-period': string;
  'time-off': string;
  'time-off-period': string;
  'actual-work-days': string;
  'actual-work-days-period': string;
  'billable-hours-summary': string;
  'billable-hours-summary-period': string;
  taxes: string;
  fees: string;
  margin: string;
}

// Billable cost flow translations
export interface BillableFlowTranslations {
  'monthly-salary': string;
  'billable-hours': string;
  'work-days': string;
  holidays: string;
  vacations: string;
  'sick-leave': string;
  taxes: string;
  fees: string;
  margin: string;
  'time-off': {
    title: string;
    description: string;
    formula: string;
  };
  'actual-work-days': {
    title: string;
    description: string;
    formula: string;
  };
  'total-yearly-cost': {
    title: string;
    description: string;
    formula: string;
  };
  'total-monthly-cost': {
    title: string;
    description: string;
    formula: string;
  };
  'total-billable-hours': {
    title: string;
    description: string;
    formula: string;
  };
  'hourly-rate': {
    title: string;
    description: string;
    formula: string;
  };
}

// Billable cost breakeven translations
export interface BillableBreakevenTranslations {
  'break-even': string;
  'per-year': string;
  'monthly-rate': string;
  'per-month': string;
  'hourly-rate': string;
  'per-hour': string;
  'day-rate': string;
  'per-day': string;
  'week-rate': string;
  'per-week': string;
}

// Billable cost translations
export interface BillableTranslations {
  title: string;
  subtitle: string;
  form: BillableFormTranslations;
  taxes: {
    title: string;
    subtitle: string;
  };
  margin: {
    title: string;
    subtitle: string;
  };
  summary: {
    title: string;
  };
  breakeven: BillableBreakevenTranslations;
  total: {
    title: string;
  };
  flow: BillableFlowTranslations;
}

// Complete expense translations
export interface ExpenseTranslations {
  actions: ExpenseActionsTranslations;
  form: ExpenseFormTranslations;
  billable: BillableTranslations;
}

// Validation translations
export interface ValidationTranslations {
  form: {
    select: string;
    required: string;
  };
  error: {
    unauthorized: string;
    'not-found': string;
    'create-failed': string;
    'update-failed': string;
    'delete-failed': string;
    'list-update-failed': string;
    'network-error': string;
    'server-error': string;
    'timeout': string;
    'validation-failed': string;
    'duplicate': string;
    'insufficient-permissions': string;
    'rate-limit': string;
    'maintenance': string;
  };
}

// Forms equipment translations
export interface FormsEquipmentTranslations {
  name: string;
  cost: string;
  purchaseDate: string;
  lifespan: string;
  usage: string;
  usageLabel: string;
  totalCost: string;
  hourlyCost: string;
}

// Forms validation translations
export interface FormsValidationTranslations {
  required: string;
  invalidType: string;
  minLength: string;
  maxLength: string;
  min: string;
  max: string;
  email: string;
  url: string;
  number: string;
  integer: string;
  positive: string;
  negative: string;
  date: string;
  string: string;
  select: string;
  custom: string;
}

// Forms accessibility translations
export interface FormsAccessibilityTranslations {
  openMenu: string;
  closeDialog: string;
  selectAll: string;
  selectRow: string;
}

// Complete forms translations
export interface FormsTranslations {
  equipment: FormsEquipmentTranslations;
  validation: FormsValidationTranslations;
  accessibility: FormsAccessibilityTranslations;
}

// Auth translations
export interface AuthTranslations {
  signIn: string;
  signOut: string;
  welcomeBack: string;
  signInDescription: string;
  createAccount: string;
  signUpDescription: string;
  userNotAuthenticated: string;
}

// Onboarding translations
export interface OnboardingTranslations {
  welcome: string;
  setupSuccess: string;
  setupError: string;
  unknownError: string;
  setupErrorMessage: string;
  retrySetup: string;
  settingUp: string;
}

// Sidebar translations
export interface SidebarTranslations {
  introduction: string;
  getStarted: string;
  tutorials: string;
  changelog: string;
  viewProject: string;
  shareProject: string;
  deleteProject: string;
  designEngineering: string;
  salesMarketing: string;
  travel: string;
}

// App translations
export interface AppTranslations {
  title: string;
  description: string;
  projectDescription: string;
}

// Analytics translations
export interface AnalyticsTranslations {
  monthlyRevenue: string;
  hourlyRate: string;
  hoursPerMonth: string;
  timeDistribution: string;
  workingDays: string;
  workingHours: string;
  nonWorkingHours: string;
  equipmentInvestment: string;
  initialCost: string;
  monthlyCost: string;
  annualROI: string;
  days: string;
  hours: string;
}

// Complete translation structure
export interface TranslationStructure {
  common: CommonTranslations;
  forms: FormsTranslations;
  navigation: NavigationTranslations;
  expenses: ExpenseTranslations;
  validation: ValidationTranslations;
  auth: AuthTranslations;
  onboarding: OnboardingTranslations;
  sidebar: SidebarTranslations;
  app: AppTranslations;
  analytics: AnalyticsTranslations;
}

// Type-safe translation key paths
export type TranslationKeyPath =
  // Common keys
  | 'common.title'
  | 'common.description'
  | 'common.currency'
  | 'common.currency-symbol'
  | 'common.not-found'
  | 'common.search'
  | 'common.delete'
  | 'common.edit'
  // Common actions
  | 'common.actions.add'
  | 'common.actions.save'
  | 'common.actions.cancel'
  | 'common.actions.close'
  | 'common.actions.open'
  // Common labels
  | 'common.labels.name'
  | 'common.labels.cost'
  | 'common.labels.category'
  | 'common.labels.date'
  | 'common.labels.lifespan'
  | 'common.labels.usage'
  | 'common.labels.amount'
  // Common placeholders
  | 'common.placeholders.enterName'
  | 'common.placeholders.selectCategory'
  | 'common.placeholders.search'
  // Common accessibility
  | 'common.accessibility.openSettings'
  | 'common.accessibility.openMenu'
  | 'common.accessibility.closeMenu'
  | 'common.accessibility.showBillablePanel'
  | 'common.accessibility.hideBillablePanel'
  | 'common.accessibility.selectLanguage'
  | 'common.accessibility.selectCurrency'
  | 'common.accessibility.selectCategory'
  | 'common.accessibility.toggleLanguage'
  | 'common.accessibility.navigationMenu'
  | 'common.accessibility.gridView'
  | 'common.accessibility.tableView'
  | 'common.accessibility.nodeView'
  | 'common.accessibility.chartView'
  | 'common.accessibility.deleteItem'
  | 'common.accessibility.addItem'
  | 'common.accessibility.editItem'
  | 'common.accessibility.alert'
  // Common categories - fixed cost
  | 'common.categories.fixed-cost.rent'
  | 'common.categories.fixed-cost.utilities'
  | 'common.categories.fixed-cost.electricity'
  | 'common.categories.fixed-cost.internet'
  | 'common.categories.fixed-cost.insurance'
  | 'common.categories.fixed-cost.subscriptions'
  | 'common.categories.fixed-cost.cloud'
  | 'common.categories.fixed-cost.transport'
  | 'common.categories.fixed-cost.domain'
  | 'common.categories.fixed-cost.tools'
  | 'common.categories.fixed-cost.accounting'
  | 'common.categories.fixed-cost.banking'
  | 'common.categories.fixed-cost.marketing'
  | 'common.categories.fixed-cost.courses'
  | 'common.categories.fixed-cost.other'
  // Common categories - equipment
  | 'common.categories.equipment.computer'
  | 'common.categories.equipment.phone'
  | 'common.categories.equipment.tablet'
  | 'common.categories.equipment.monitor'
  | 'common.categories.equipment.keyboard'
  | 'common.categories.equipment.mouse'
  | 'common.categories.equipment.printer'
  | 'common.categories.equipment.camera'
  | 'common.categories.equipment.headphones'
  | 'common.categories.equipment.speakers'
  | 'common.categories.equipment.hd'
  | 'common.categories.equipment.other'
  // Common period
  | 'common.period.per-month'
  | 'common.period.per-year'
  | 'common.period.monthly'
  | 'common.period.yearly'
  | 'common.period.months'
  // Forms equipment
  | 'forms.equipment.name'
  | 'forms.equipment.cost'
  | 'forms.equipment.purchaseDate'
  | 'forms.equipment.lifespan'
  | 'forms.equipment.usage'
  // Forms validation
  | 'forms.validation.required'
  | 'forms.validation.invalidType'
  | 'forms.validation.minLength'
  | 'forms.validation.maxLength'
  | 'forms.validation.min'
  | 'forms.validation.max'
  | 'forms.validation.email'
  | 'forms.validation.url'
  | 'forms.validation.number'
  | 'forms.validation.integer'
  | 'forms.validation.positive'
  | 'forms.validation.negative'
  | 'forms.validation.date'
  | 'forms.validation.string'
  | 'forms.validation.select'
  | 'forms.validation.custom'
  // Forms accessibility
  | 'forms.accessibility.openMenu'
  | 'forms.accessibility.closeDialog'
  | 'forms.accessibility.selectAll'
  | 'forms.accessibility.selectRow'
  // Navigation
  | 'navigation.top-level.hourly-rate'
  | 'navigation.top-level.project-rate'
  | 'navigation.bottom-level.fixed-cost'
  | 'navigation.bottom-level.variable-cost'
  | 'navigation.bottom-level.equipment-cost'
  // Expenses
  | 'expenses.actions.add-expense'
  | 'expenses.actions.edit-expense'
  | 'expenses.form.category'
  | 'expenses.form.name'
  | 'expenses.form.value'
  | 'expenses.form.period'
  // Validation
  | 'validation.form.select'
  | 'validation.form.required'
  | 'validation.error.unauthorized'
  | 'validation.error.not-found'
  | 'validation.error.create-failed'
  | 'validation.error.update-failed'
  | 'validation.error.delete-failed'
  | 'validation.error.list-update-failed'
  | 'validation.error.network-error'
  | 'validation.error.server-error'
  | 'validation.error.timeout'
  | 'validation.error.validation-failed'
  | 'validation.error.duplicate'
  | 'validation.error.insufficient-permissions'
  | 'validation.error.rate-limit'
  | 'validation.error.maintenance'
  // Auth
  | 'auth.signIn'
  | 'auth.signOut';

// Utility type to extract nested keys from an object type
export type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

// Generate all possible translation keys from the structure
export type AllTranslationKeys = NestedKeyOf<TranslationStructure>;