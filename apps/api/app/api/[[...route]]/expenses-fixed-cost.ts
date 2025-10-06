import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { FixedCostExpensesRepository } from "@repo/database";
import { CloudflareKvCacheRepository } from "@repo/database/repositories/cloudflare-kv-cache-repository";
import { FixedCostCacheKeys } from "@repo/database/cache-keys/fixed-cost-cache-keys";

const createExpenseSchema = z.object({
  category: z.string(),
  amount: z.number(),
  name: z.string().min(1),
  userId: z.string(),
  rank: z.number(),
  period: z.enum(["monthly", "yearly"]).optional(),
});

const updateExpenseSchema = z.object({
  category: z.string().optional(),
  amount: z.number().optional(),
  name: z.string().min(1).optional(),
  userId: z.string(),
  rank: z.number().optional(),
  period: z.enum(["monthly", "yearly"]).optional(),
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
        period: z.enum(["monthly", "yearly"]).optional(),
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
      const cacheRepository = new CloudflareKvCacheRepository();

      const cache = await cacheRepository.get(
        FixedCostCacheKeys.fixedCostsList(userId)
      );

      if (cache && cache?.length > 0) {
        const cacheData = JSON.parse(cache);
        return c.json({ status: 200, success: true, data: cacheData });
      }

      const fixedCostExpenses =
        await fixedCostExpensesRepository.findByUserId(userId);

      if (fixedCostExpenses && fixedCostExpenses?.length > 0) {
        await cacheRepository.set(
          FixedCostCacheKeys.fixedCostsList(userId),
          JSON.stringify(fixedCostExpenses)
        );
      }
      return c.json({ status: 200, success: true, data: fixedCostExpenses });
    }
  )
  .patch(
    "/fixed-costs/:id",
    zValidator("json", updateExpenseSchema),
    async (c) => {
      const { name, amount, category, rank, userId, period } =
        c.req.valid("json");
      const { id } = c.req.param();
      try {
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const repository = new FixedCostExpensesRepository();
        const cacheRepository = new CloudflareKvCacheRepository();

        await repository.update(userId, id, {
          name,
          amount,
          category,
          rank,
          period,
        });

        await cacheRepository.delete(FixedCostCacheKeys.fixedCostsList(userId));

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

      const repository = new FixedCostExpensesRepository();
      const cacheRepository = new CloudflareKvCacheRepository();

      const updatedExpenses = await repository.updateBatch(userId, updates);

      await cacheRepository.delete(FixedCostCacheKeys.fixedCostsList(userId));

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
    const { name, amount, category, userId, period, rank } =
      c.req.valid("json");
    try {
      if (!userId) {
        throw new Error("Unauthorized");
      }

      const repository = new FixedCostExpensesRepository();
      const cacheRepository = new CloudflareKvCacheRepository();

      const expense = await repository.create({
        name,
        amount,
        category,
        userId,
        period,
        rank,
      });

      await cacheRepository.delete(FixedCostCacheKeys.fixedCostsList(userId));

      return c.json({
        status: 201,
        success: true,
        data: {
          id: expense.id,
          name: expense.name,
          amount: expense.amount,
          category: expense.category,
          rank: expense.rank,
          period: expense.period,
        },
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

      const repository = new FixedCostExpensesRepository();
      const cacheRepository = new CloudflareKvCacheRepository();

      await repository.delete(userId, id);

      await cacheRepository.delete(FixedCostCacheKeys.fixedCostsList(userId));

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
