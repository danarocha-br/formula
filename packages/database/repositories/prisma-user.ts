import { User, Prisma } from "@prisma/client";

import { database } from "..";
import { IUsersRepository } from "./dtos/users-repository";

export class PrismaUserRepository implements IUsersRepository {
  /**
   * Finds a user by ID.
   *
   * @param {string} userId The ID of the user.
   * @returns {Promise<User | null>} The user if found, null otherwise.
   */
  async findById(userId: string): Promise<User | null> {
    const user = await database.user.findFirst({
      where: {
        id: userId,
      },
    });

    return user;
  }

  /**
   * Creates a new user.
   *
   * @param {Prisma.UserUncheckedCreateInput} data The data to create the user with.
   * @returns {Promise<User>} The created user.
   */
  async create(data: Prisma.UserUncheckedCreateInput): Promise<User> {
    const user = await database.user.create({
      data,
    });

    return user;
  }

  /**
   * Updates an existing user by ID.
   *
   * @param {string} userId - The ID of the user to update.
   * @param {Prisma.UserUncheckedUpdateInput} data - The data to update the user with.
   * @returns {Promise<User>} - The updated user.
   * @throws {Error} - Throws an error if the user is not found.
   */
  async update(
    userId: string,
    data: Prisma.UserUncheckedUpdateInput
  ): Promise<User> {
    const existingUser = await database.user.findFirst({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new Error("User not found");
    }

    const user = await database.user.update({
      where: {
        id: existingUser.id,
      },
      data,
    });

    return user;
  }

  /**
   * Deletes a user by ID.
   *
   * @param {string} userId - The ID of the user to delete.
   * @returns {Promise<void>} - A promise that resolves when the user has been deleted.
   * If the user is not found, no action is taken.
   */
  async delete(userId: string): Promise<void> {
    const user = await database.user.findFirst({
      where: { id: userId },
    });

    if (user) {
      await database.user.delete({
        where: { id: user.id },
      });
    }
  }
}
