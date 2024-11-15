import { ExpensesBillableCost, Prisma } from "@prisma/client";

export interface IBillableCostExpensesRepository {
  create(
    data: Prisma.ExpensesBillableCostUncheckedCreateInput
  ): Promise<ExpensesBillableCost>;
  findByUserId(userId: string): Promise<ExpensesBillableCost | null>;
  update(
    userId: string,
    data: Prisma.ExpensesBillableCostUncheckedUpdateInput
  ): Promise<ExpensesBillableCost | null>;
  delete(userId: string): Promise<void>;
}
