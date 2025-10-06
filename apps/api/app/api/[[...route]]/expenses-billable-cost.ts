import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { BillableCostExpensesRepository } from "@repo/database";
import { CloudflareKvCacheRepository } from "@repo/database/repositories/cloudflare-kv-cache-repository";
import { BillableCostCacheKeys } from "@repo/database/cache-keys/billable-cost-cache-keys";

const updateBillableSchema = z.object({
  userId: z.string(),
  workDays: z.number().optional(),
  hoursPerDay: z.number().optional(),
  holidaysDays: z.number().optional(),
  vacationsDays: z.number().optional(),
  sickLeaveDays: z.number().optional(),
  billableHours: z.number().optional(),
  monthlySalary: z.number().optional(),
  taxes: z.number().optional(),
  fees: z.number().optional(),
  margin: z.number().optional(),
});

const createBillableSchema = z.object({
  userId: z.string(),
});

export const expensesBillableCosts = new Hono()
  .get(
    "/billable-costs",
    zValidator("query", z.object({ userId: z.string() })),
    async (c) => {
      const { userId } = c.req.valid("query");
      if (!userId) {
        throw new Error("Unauthorized");
      }
      const repository = new BillableCostExpensesRepository();
      const cacheRepository = new CloudflareKvCacheRepository();

      const cache = await cacheRepository.get(
        BillableCostCacheKeys.billableCost(userId)
      );

      if (cache && cache?.length > 0) {
        const cacheData = JSON.parse(cache);
        return c.json({ status: 200, success: true, data: cacheData });
      }

      const billableCostExpenses = await repository.findByUserId(userId);

      if (billableCostExpenses) {
        await cacheRepository.set(
          BillableCostCacheKeys.billableCost(userId),
          JSON.stringify(billableCostExpenses)
        );
      }

      return c.json({ status: 200, success: true, data: billableCostExpenses });
    }
  )
  .post(
    "/billable-costs",
    zValidator("json", createBillableSchema),
    async (c) => {
      const { userId } = c.req.valid("json");

      if (!userId) {
        throw new Error("Unauthorized");
      }
      const repository = new BillableCostExpensesRepository();
      const cacheRepository = new CloudflareKvCacheRepository();

      try {
        const billableCostExpenses = await repository.create({
          userId,
          workDays: 5,
          holidaysDays: 12,
          vacationsDays: 30,
          sickLeaveDays: 3,
          billableHours: 0,
          hoursPerDay: 6,
          monthlySalary: 0,
          taxes: 0,
          fees: 0,
          margin: 0,
        });

        await cacheRepository.set(
          BillableCostCacheKeys.billableCost(userId),
          JSON.stringify(billableCostExpenses)
        );

        return c.json({
          status: 201,
          success: true,
          data: billableCostExpenses,
        });
      } catch (error) {
        console.error("Failed to create billable expense:", error);
        return c.json({
          status: 400,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create billable expense",
        });
      }
    }
  )
  .patch(
    "/billable-costs",
    zValidator("json", updateBillableSchema),
    async (c) => {
      const {
        userId,
        workDays,
        holidaysDays,
        hoursPerDay,
        billableHours,
        vacationsDays,
        sickLeaveDays,
        monthlySalary,
        taxes,
        fees,
        margin,
      } = c.req.valid("json");
      try {
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const repository = new BillableCostExpensesRepository();
        const cacheRepository = new CloudflareKvCacheRepository();

        const data = await repository.update(userId, {
          workDays,
          hoursPerDay,
          holidaysDays,
          vacationsDays,
          sickLeaveDays,
          billableHours,
          monthlySalary,
          taxes,
          fees,
          margin,
        });

        await cacheRepository.delete(
          BillableCostCacheKeys.billableCost(userId)
        );

        return c.json({
          status: 200,
          success: true,
          data: data,
        });
      } catch (error) {
        console.error("Failed to update billable expense:", error);
        return c.json({
          status: 400,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update billable expense",
        });
      }
    }
  );
