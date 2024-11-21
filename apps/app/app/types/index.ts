export type Locale = "en-US" | "pt-BR";
export interface ExpenseItem {
  name: string;
  userId: string;
  id: number;
  amount: number;
  rank: number;
  period: 'monthly' | 'yearly';
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface EquipmentExpenseItem {
  id: number;
  name: string;
  userId: string;
  rank: number;
  amount: number;
  purchaseDate: Date;
  usage: number;
  lifeSpan: number;
  category: EquipmentCategory;
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

export type EquipmentCategory =
  | "computer"
  | "keyboard"
  | "mouse"
  | "headphones"
  | "external driver"
  | "monitor"
  | "printer"
  | "other";

export type CostStatus = "ongoing" | "canceled" | "overdue";