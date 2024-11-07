import { ExpensesBillableCost, Prisma } from "@prisma/client";

export interface IBillableCostExpensesRepository {
  create(
    data: Prisma.ExpensesBillableCostCreateInput
  ): Promise<ExpensesBillableCost>;
  findById(userId: string, id: string): Promise<ExpensesBillableCost | null>;
  findByUserId(userId: string): Promise<ExpensesBillableCost[] | null>;
  update(
    userId: string,
    id: string,
    data: Prisma.ExpensesBillableCostUncheckedUpdateInput
  ): Promise<ExpensesBillableCost | null>;
  delete(userId: string, id: string): Promise<void>;
}
