export type Locale = "en-US" | "pt-BR";
export interface ExpenseItem {
  name: string;
  userId: string;
  id: number;
  amount: number;
  rank: number;
  period: string | null;
  category: string;
  createdAt: string;
  updatedAt: string;
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