export const BILL_CATEGORIES = [
  'personal_loan',
  'student_loan',
  'car_loan',
  'mortgage',
  'credit_card',
  'utility',
  'subscription',
  'other',
] as const;

export type BillCategory = (typeof BILL_CATEGORIES)[number];

export const BILL_CATEGORY_LABELS: Record<BillCategory, string> = {
  personal_loan: 'Personal Loan',
  student_loan: 'Student Loan',
  car_loan: 'Car Loan',
  mortgage: 'Mortgage',
  credit_card: 'Credit Card',
  utility: 'Utility',
  subscription: 'Subscription',
  other: 'Other',
};
