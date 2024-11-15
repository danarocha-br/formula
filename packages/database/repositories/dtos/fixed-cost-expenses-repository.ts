import { ExpensesFixedCost, Prisma } from "@prisma/client";

export interface IFixedCostExpensesRepository {
  create(
    data: Prisma.ExpensesFixedCostUncheckedCreateInput
  ): Promise<ExpensesFixedCost>;
  findById(userId: string, id: string): Promise<ExpensesFixedCost | null>;
  findByUserId(userId: string): Promise<ExpensesFixedCost[] | null>;
  update(
    userId: string,
    id: string,
    data: Prisma.ExpensesFixedCostUncheckedUpdateInput
  ): Promise<ExpensesFixedCost | null>;
  updateBatch(
    userId: string,
    updates: Array<{
      id: number;
      data: Prisma.ExpensesFixedCostUncheckedUpdateInput;
    }>
  ): Promise<ExpensesFixedCost[] | null>;
  delete(userId: string, id: string): Promise<void>;
}
