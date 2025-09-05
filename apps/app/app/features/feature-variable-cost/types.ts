import type { EquipmentCategory } from "@formula/shared/types";

export interface EquipmentExpenseItem {
  id: number;
  userId: string;
  name: string;
  category: EquipmentCategory;
  amount: number;
  rank: number;
  purchaseDate: string;
  usage: number;
  lifeSpan: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEquipmentExpenseRequest {
  userId: string;
  name: string;
  category: EquipmentCategory;
  amount: number;
  rank: number;
  purchaseDate: string;
  usage: number;
  lifeSpan: number;
}

export interface CreateEquipmentExpenseResponse {
  status: number;
  success: boolean;
  data: {
    id: number;
    userId: string;
    name: string;
    category: EquipmentCategory;
    amount: number;
    rank: number;
    purchaseDate: string;
    usage: number;
    lifeSpan: number;
    createdAt: string;
    updatedAt: string;
  };
  error?: string;
}
