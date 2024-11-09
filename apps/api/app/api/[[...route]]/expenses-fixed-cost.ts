import { zValidator } from "@hono/zod-validator";
import { FixedCostExpensesRepository } from "@repo/database";
import { PrismaFixedCostExpensesRepository } from "@repo/database/repositories/prisma-fixed-cost-expenses";
import { Hono } from "hono";
import { z } from "zod";

const createExpenseSchema = z.object({
  category: z.string(),
  amount: z.number(),
  name: z.string().min(1),
  userId: z.string(),
  rank: z.number(),
});

const updateExpenseSchema = z.object({
  category: z.string().optional(),
  amount: z.number().optional(),
  name: z.string().min(1).optional(),
  userId: z.string(),
  rank: z.number().optional(),
});

const updateExpensesSchema = z.object({
  userId: z.string(),
  updates: z.array(
    z.object({
      id: z.number(),
      data: z.object({
        category: z.string().optional(),
        amount: z.number().optional(),
        name: z.string().min(1).optional(),
        rank: z.number().optional(),
      }),
    })
  ),
});

export const expensesFixedCosts = new Hono()
  .get(
    "/fixed-costs",
    zValidator("query", z.object({ userId: z.string() })),
    async (c) => {
      const { userId } = c.req.valid("query");
      if (!userId) {
        throw new Error("Unauthorized");
      }
      const fixedCostExpensesRepository = new FixedCostExpensesRepository();
      const fixedCostExpenses =
        await fixedCostExpensesRepository.findByUserId(userId);
      return c.json({ status: 200, success: true, data: fixedCostExpenses });
    }
  )
  .patch(
    "/fixed-costs/:id",
    zValidator("json", updateExpenseSchema),
    async (c) => {
      const { name, amount, category, rank, userId } = c.req.valid("json");
      const { id } = c.req.param();
      try {
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const repository = new PrismaFixedCostExpensesRepository();

        await repository.update(userId, id, {
          name,
          amount,
          category,
          rank,
        });

        return c.json({
          status: 200,
          success: true,
          data: { name, amount, category },
        });
      } catch (error) {
        console.error("Failed to update fixed expense:", error);
        return c.json({
          status: 400,
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to update expense",
        });
      }
    }
  )
  .put("/fixed-costs", zValidator("json", updateExpensesSchema), async (c) => {
    const { updates, userId } = c.req.valid("json");
    try {
      if (!userId) {
        throw new Error("Unauthorized");
      }

      const repository = new PrismaFixedCostExpensesRepository();

      const updatedExpenses = await repository.updateBatch(userId, updates);

      return c.json({
        status: 200,
        success: true,
        data: updatedExpenses,
      });
    } catch (error) {
      console.error("Failed to update fixed expense:", error);
      return c.json({
        status: 400,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to update expense",
      });
    }
  })
  .post("/fixed-costs", zValidator("json", createExpenseSchema), async (c) => {
    const { name, amount, category, userId } = c.req.valid("json");
    try {
      if (!userId) {
        throw new Error("Unauthorized");
      }

      const repository = new PrismaFixedCostExpensesRepository();

      await repository.create({
        name,
        amount,
        category,
        userId,
      });

      return c.json({
        status: 201,
        success: true,
        data: { name, amount, category },
      });
    } catch (error) {
      console.error("Failed to create fixed expense:", error);
      return c.json({
        status: 400,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to create expense",
      });
    }
  })
  .delete("/fixed-costs/:userId/:id", async (c) => {
    const { id, userId } = c.req.param();
    try {
      if (!id) {
        throw new Error("Unauthorized");
      }

      const repository = new PrismaFixedCostExpensesRepository();

      await repository.delete(userId, id);

      return c.json({ status: 204, success: true });
    } catch (error) {
      console.error("Failed to delete fixed expense:", error);
      return c.json({
        status: 400,
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to delete expense",
      });
    }
  });
