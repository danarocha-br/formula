import {
  ExpensesBillableCost,
  ExpensesFixedCost,
  Prisma,
} from "@prisma/client";

import { database } from "..";
import { IBillableCostExpensesRepository } from "./dtos/billable-cost-expenses-repository";

export class PrismaBillableCostExpensesRepository
  implements IBillableCostExpensesRepository
{
  /**
   * Finds a billable cost expense by user ID.
   *
   * @param {string} userId The ID of the user that owns the expense.
   * @returns {Promise<ExpensesBillableCost | null>} The expense if found, null otherwise.
   */
  async findByUserId(userId: string): Promise<ExpensesBillableCost | null> {
    const expenses = await database.expensesBillableCost.findFirst({
      where: {
        userId: userId,
      },
    });

    return expenses;
  }

  /**
   * Creates a new billable cost expense.
   *
   * @param {Prisma.ExpensesBillableCostCreateInput} data The data to create the expense with.
   * @returns {Promise<ExpensesBillableCost>} The created billable cost expense.
   */
  async create(
    data: Prisma.ExpensesBillableCostUncheckedCreateInput
  ): Promise<ExpensesBillableCost> {
    const expense = await database.expensesBillableCost.create({
      data,
    });

    return expense;
  }

  /**
   * Updates a billable cost expense for a specific user.
   *
   * @param {string} userId The ID of the user that owns the expense.
   * @param {Prisma.ExpensesBillableCostUncheckedUpdateInput} data The data to update the expense with.
   * @returns {Promise<ExpensesBillableCost>} The updated billable cost expense.
   */
  async update(
    userId: string,
    data: Prisma.ExpensesBillableCostUncheckedUpdateInput
  ): Promise<ExpensesBillableCost> {
    const existingExpense = await database.expensesBillableCost.findFirst({
      where: { userId },
    });

    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    const expense = await database.expensesBillableCost.update({
      where: {
        id: existingExpense.id,
      },
      data,
    });

    return expense;
  }

  async delete(userId: string): Promise<void> {
    const expense = await database.expensesBillableCost.findFirst({
      where: { userId },
    });

    if (expense) {
      await database.expensesBillableCost.delete({
        where: { id: expense.id },
      });
    }
  }
}
