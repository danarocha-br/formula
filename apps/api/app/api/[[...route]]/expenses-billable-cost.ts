import { zValidator } from "@hono/zod-validator";
import { BillableCostExpensesRepository } from "@repo/database";
import { CloudflareKvCacheRepository } from "@repo/database/repositories/cloudflare-kv-cache-repository";
import { BillableCostCacheKeys } from "@repo/database/cache-keys/billable-cost-cache-keys";
import { RedisCacheRepository } from "@repo/database/repositories/redis-cache-repository";
import { Hono } from "hono";
import { z } from "zod";

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
        // Check if billable cost already exists for this user
        const existingExpense = await repository.findByUserId(userId);
        if (existingExpense) {
          // If it already exists, return it instead of creating a new one
          return c.json({
            status: 200,
            success: true,
            data: existingExpense,
          });
        }

        // Calculate default billable hours
        const defaultWorkDays = 5;
        const defaultHoursPerDay = 6;
        const defaultHolidaysDays = 12;
        const defaultVacationsDays = 30;
        const defaultSickLeaveDays = 3;
        const defaultTimeOff = defaultHolidaysDays + defaultVacationsDays + defaultSickLeaveDays;
        const defaultWorkDaysPerYear = defaultWorkDays * 52;
        const defaultActualWorkDays = defaultWorkDaysPerYear - defaultTimeOff;
        const defaultBillableHours = defaultActualWorkDays * defaultHoursPerDay;

        const billableCostExpenses = await repository.create({
          userId,
          workDays: defaultWorkDays,
          holidaysDays: defaultHolidaysDays,
          vacationsDays: defaultVacationsDays,
          sickLeaveDays: defaultSickLeaveDays,
          billableHours: defaultBillableHours,
          hoursPerDay: defaultHoursPerDay,
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

        // Handle specific Prisma constraint errors
        if (error instanceof Error && error.message.includes('Unique constraint')) {
            console.log('Billable expense already exists for user:', userId);
            // Try to fetch the existing record instead
            try {
              const existingRecord = await repository.findByUserId(userId);
              if (existingRecord) {
                return c.json({
                  status: 200,
                  success: true,
                  data: existingRecord,
                });
              }
            } catch (fetchError) {
              console.error('Failed to fetch existing record:', fetchError);
            }
          }

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
