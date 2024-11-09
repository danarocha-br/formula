import { ExpensesFixedCost, Prisma } from "@prisma/client";

import { IFixedCostExpensesRepository } from "./dtos/fixed-cost-expenses-repository";
import { database } from "..";

export class PrismaFixedCostExpensesRepository
  implements IFixedCostExpensesRepository
{
  /**
   * Finds a fixed cost expense by its ID.
   *
   * @param {string} userId The ID of the user that owns the expense.
   * @param {number} id The ID of the expense to find.
   * @returns {Promise<ExpensesFixedCost | null>} The found expense, or null if not found.
   */

  async findById(
    userId: string,
    id: string
  ): Promise<ExpensesFixedCost | null> {
    const expense = await database.expensesFixedCost.findUnique({
      where: {
        userId: userId,
        id: Number(id),
      },
    });

    return expense;
  }

  /**
   * Retrieves all fixed cost expenses associated with a specific user.
   *
   * @param {string} userId - The ID of the user whose expenses are to be retrieved.
   * @returns {Promise<ExpensesFixedCost[] | null>} A promise that resolves to an array of the user's fixed cost expenses, or null if none are found.
   */

  async findByUserId(userId: string): Promise<ExpensesFixedCost[] | null> {
    const expenses = await database.expensesFixedCost.findMany({
      where: {
        userId: userId,
      },
    });

    return expenses;
  }

  /**
   * Creates a new fixed cost expense.
   *
   * @param {Prisma.ExpensesFixedCostCreateInput} data The data to create the expense with.
   * @returns {Promise<ExpensesFixedCost>} The created expense.
   */
  async create(
    data: Prisma.ExpensesFixedCostCreateInput
  ): Promise<ExpensesFixedCost> {
    const expense = await database.expensesFixedCost.create({
      data,
    });

    return expense;
  }

  /**
   * Updates an existing fixed cost expense.
   *
   * @param {string} userId The ID of the user that owns the expense.
   * @param {number} id The ID of the expense to update.
   * @param {Prisma.ExpensesFixedCostUncheckedUpdateInput} data The data to update the expense with.
   * @returns {Promise<ExpensesFixedCost>} The updated expense.
   */

  async update(
    userId: string,
    id: string,
    data: Prisma.ExpensesFixedCostUncheckedUpdateInput
  ): Promise<ExpensesFixedCost> {
    const expense = await database.expensesFixedCost.update({
      where: {
        userId,
        id: Number(id),
      },
      data,
    });

    return expense;
  }

  /**
   * Updates multiple fixed cost expenses in a single transaction.
   *
   * @param {string} userId The ID of the user that owns the expenses.
   * @param {Array<{id: number, data: Prisma.ExpensesFixedCostUncheckedUpdateInput}>} updates An array of objects. Each object should contain the ID of the expense to update and the data to update it with.
   * @returns {Promise<Array<ExpensesFixedCost>>} A promise that resolves to an array of the updated expenses.
   */
  async updateBatch(
    userId: string,
    updates: Array<{
      id: number;
      data: Prisma.ExpensesFixedCostUncheckedUpdateInput;
    }>
  ): Promise<Array<ExpensesFixedCost>> {
    const transaction = await database.$transaction(
      updates.map(({ id, data }) =>
        database.expensesFixedCost.update({
          where: {
            userId,
            id,
          },
          data,
        })
      )
    );

    return transaction;
  }

  /**
   * Deletes a fixed cost expense.
   *
   * @param {string} userId The ID of the user that owns the expense.
   * @param {number} id The ID of the expense to delete.
   * @returns {Promise<void>} Nothing.
   */

  async delete(userId: string, id: string): Promise<void> {
    await database.expensesFixedCost.delete({
      where: {
        userId,
        id: Number(id),
      },
    });
  }
}
