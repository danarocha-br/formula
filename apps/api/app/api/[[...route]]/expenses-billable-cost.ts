import { zValidator } from "@hono/zod-validator";
import { BillableCostExpensesRepository } from "@repo/database";
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
      const billableCostExpenses = await repository.findByUserId(userId);
      return c.json({ status: 200, success: true, data: billableCostExpenses });
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
            error instanceof Error ? error.message : "Failed to update billable expense",
        });
      }
    }
  );
