"use server";

import { getTranslations } from "@/utils/translations";
import { auth } from "@clerk/nextjs/server";
import { PrismaFixedCostExpensesRepository } from "@repo/database/repositories/prisma-fixed-cost-expenses";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const t = getTranslations();

const expenseSchema = z.object({
  category: z.string(),
  amount: z.number({
    required_error: t.validation.form.required,
  }),
  name: z
    .string({
      required_error: t.validation.form.required,
    })
    .min(1, {
      message: t.validation.form.required,
    }),
});

export async function createFixedExpense(data: z.infer<typeof expenseSchema>) {
  try {
    const { userId } = await auth();
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const repository = new PrismaFixedCostExpensesRepository();

    await repository.create({
      name: data.name,
      amount: data.amount,
      category: data.category,
      userId,
    });

    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("Failed to create fixed expense:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to create expense",
    };
  }
}
