export type Locale = "en" | "pt-BR";
export interface ExpenseItem {
  id: string | number;
  name: string;
  amount: number;
  category: string;
  period?: string | null;
  createdAt: Date;
}

export type FixedCostCategory =
  | "rent"
  | "utilities"
  | "electricity"
  | "internet/phone"
  | "insurance"
  | "subscriptions"
  | "cloud services"
  | "domain/hosting"
  | "tools"
  | "accounting"
  | "banking fees"
  | "marketing"
  | "courses/training"
  | "other";

export type CostStatus = "ongoing" | "canceled" | "overdue";