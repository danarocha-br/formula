import { User, Prisma } from "@prisma/client";

export interface IUsersRepository {
  create(data: Prisma.UserUncheckedCreateInput): Promise<User>;
  findById(userId: string): Promise<User | null>;
  update(
    userId: string,
    data: Prisma.UserUncheckedUpdateInput
  ): Promise<User | null>;
  delete(userId: string): Promise<void>;
}
