import {
  EquipmentExpense,
  Prisma,
} from "@prisma/client";

import { database } from "..";
import { IEquipmentCostRepository } from "./dtos/equipment-cost-repository";

export class PrismaEquipmentCostRepository implements IEquipmentCostRepository {
  /**
   * Finds an equipment cost expense by user ID.
   *
   * @param {string} userId The ID of the user that owns the equipment expense.
   * @returns {Promise<EquipmentExpense | null>} The equipment expense if found, null otherwise.
   */
  async findByUserId(userId: string): Promise<EquipmentExpense | null> {
    const expenses = await database.equipmentExpense.findFirst({
      where: {
        userId: userId,
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
   * Deletes an equipment cost expense for a specific user.
   *
   * @param {string} userId The ID of the user that owns the expense.
   * @returns {Promise<void>} A promise that resolves when the expense has been deleted.
   * @throws {Error} Throws an error if the expense is not found for the given user.
   */
  async delete(userId: string): Promise<void> {
    const expense = await database.equipmentExpense.findFirst({
      where: { userId },
    });

    if (expense) {
      await database.equipmentExpense.delete({
        where: { id: expense.id },
      });
    }
  }
}
