import { ExpensesFixedCost, Prisma } from "@prisma/client";

export interface IFixedCostExpensesRepository {
  create(data: Prisma.ExpensesFixedCostCreateInput): Promise<ExpensesFixedCost>;
  findById(
    userId: string,
    id: number
  ): Promise<ExpensesFixedCost | null>;
  findByUserId(userId: string): Promise<ExpensesFixedCost[] | null>;
  update(
    userId: string,
    id: number,
    data: Prisma.ExpensesFixedCostUncheckedUpdateInput
  ): Promise<ExpensesFixedCost | null>;
  delete(userId: string, id: number): Promise<void>;
}
