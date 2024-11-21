import { EquipmentExpense, Prisma } from "@prisma/client";

export interface IEquipmentCostRepository {
  create(
    data: Prisma.EquipmentExpenseUncheckedCreateInput
  ): Promise<EquipmentExpense>;
  findByUserId(userId: string): Promise<EquipmentExpense | null>;
  update(
    userId: string,
    data: Prisma.EquipmentExpenseUncheckedUpdateInput
  ): Promise<EquipmentExpense | null>;
  delete(userId: string): Promise<void>;
}
