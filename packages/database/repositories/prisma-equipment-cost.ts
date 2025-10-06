import type {
  EquipmentExpense,
  Prisma,
} from "@prisma/client";

import { database } from "..";
import type { IEquipmentCostRepository } from "./dtos/equipment-cost-repository";

export class PrismaEquipmentCostRepository implements IEquipmentCostRepository {
  /**
   * Finds all equipment cost expenses by user ID.
   *
   * @param {string} userId The ID of the user that owns the equipment expenses.
   * @returns {Promise<EquipmentExpense[]>} The equipment expenses if found, empty array otherwise.
   */
  async findByUserId(userId: string): Promise<EquipmentExpense[]> {
    const expenses = await database.equipmentExpense.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        rank: 'asc',
      },
    });

    return expenses;
  }

  /**
   * Creates a new equipment cost expense.
   *
   * @param {Prisma.EquipmentExpenseUncheckedCreateInput} data The data to create the expense with.
   * @returns {Promise<EquipmentExpense>} The created equipment expense.
   */
  async create(
    data: Prisma.EquipmentExpenseUncheckedCreateInput
  ): Promise<EquipmentExpense> {
    const expense = await database.equipmentExpense.create({
      data,
    });

    return expense;
  }

/**
 * Updates an equipment cost expense for a specific user.
 *
 * @param {string} userId The ID of the user that owns the equipment expense.
 * @param {Prisma.EquipmentExpenseUncheckedUpdateInput} data The data to update the equipment expense with.
 * @returns {Promise<EquipmentExpense>} The updated equipment expense.
 * @throws {Error} Throws an error if the equipment expense is not found for the given user.
 */
  async update(
    userId: string,
    data: Prisma.EquipmentExpenseUncheckedUpdateInput
  ): Promise<EquipmentExpense> {
    const existingExpense = await database.equipmentExpense.findFirst({
      where: { userId },
    });

    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    const expense = await database.equipmentExpense.update({
      where: {
        id: existingExpense.id,
      },
      data,
    });

    return expense;
  }

  /**
   * Deletes a specific equipment cost expense.
   *
   * @param {number} id The ID of the expense to delete.
   * @returns {Promise<void>} A promise that resolves when the expense has been deleted.
   * @throws {Error} Throws an error if the expense is not found.
   */
  async delete(id: number): Promise<void> {
    await database.equipmentExpense.delete({
      where: { id },
    });
  }
}
