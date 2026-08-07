export interface CurrencySeed {
  code: string;
  symbol: string;
  label: string;
}

export interface OptionLabelSeed {
  value: string;
  label: string;
}

export const CURRENCIES_SEED: CurrencySeed[] = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'US Dollar' },
  { code: 'EUR', symbol: '€', label: 'Euro' },
  { code: 'GBP', symbol: '£', label: 'British Pound' },
];

export const CONTRACT_TYPES_SEED: OptionLabelSeed[] = [
  { value: 'full_time', label: 'Full time' },
  { value: 'loan', label: 'Loan' },
  { value: 'youth', label: 'Youth' },
  { value: 'short_term', label: 'Short term' },
  { value: 'amateur', label: 'Amateur' },
];

export const TRANSFER_TYPES_SEED: OptionLabelSeed[] = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'loan', label: 'Loan' },
];

export const ACCESS_LEVELS_SEED: OptionLabelSeed[] = [
  { value: 'general', label: 'General' },
  { value: 'restricted', label: 'Restricted' },
  { value: 'vip', label: 'VIP' },
  { value: 'all_areas', label: 'All Areas' },
];
