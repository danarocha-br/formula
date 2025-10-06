import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { EquipmentCostRepository } from "@repo/database";
import { CloudflareKvCacheRepository } from "@repo/database/repositories/cloudflare-kv-cache-repository";
import { EquipmentCostCacheKeys } from "@repo/database/cache-keys/equipment-cost-cache-keys";

const updateEquipmentSchema = z.object({
  userId: z.string(),
  name: z.string().optional(),
  amount: z.number().optional(),
  rank: z.number().optional(),
  category: z.string().optional(),
  purchaseDate: z.coerce.date().optional(),
  usage: z.number().optional(),
  lifeSpan: z.number().optional(),
});

const createEquipmentSchema = z.object({
  userId: z.string(),
  name: z.string(),
  amount: z.number(),
  rank: z.number(),
  category: z.string(),
  purchaseDate: z.coerce.date(),
  usage: z.number(),
  lifeSpan: z.number(),
});

export const expensesEquipmentCosts = new Hono()
  .get(
    "/equipment-costs",
    zValidator("query", z.object({ userId: z.string() })),
    async (c) => {
      const { userId } = c.req.valid("query");
      if (!userId) {
        throw new Error("Unauthorized");
      }
      const repository = new EquipmentCostRepository();
      const cacheRepository = new CloudflareKvCacheRepository();

      const cache = await cacheRepository.get(
        EquipmentCostCacheKeys.list(userId)
      );

      if (cache && cache?.length > 0) {
        const cacheData = JSON.parse(cache);
        return c.json({ status: 200, success: true, data: cacheData });
      }

      const equipmentCost = await repository.findByUserId(userId);

      if (equipmentCost) {
        await cacheRepository.set(
          EquipmentCostCacheKeys.list(userId),
          JSON.stringify(equipmentCost)
        );
      }

      return c.json({ status: 200, success: true, data: equipmentCost });
    }
  )
  .post(
    "/equipment-costs",
    zValidator("json", createEquipmentSchema),
    async (c) => {
      const { userId, ...data } = c.req.valid("json");

      if (!userId) {
        throw new Error("Unauthorized");
      }
      const repository = new EquipmentCostRepository();
      const cacheRepository = new CloudflareKvCacheRepository();

      try {
        const equipmentCost = await repository.create({
          userId,
          ...data,
        });

        await cacheRepository.delete(EquipmentCostCacheKeys.list(userId));

        return c.json({
          status: 201,
          success: true,
          data: equipmentCost,
        });
      } catch (error) {
        console.error("Failed to create equipment cost:", error);
        return c.json({
          status: 400,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to create equipment cost",
        });
      }
    }
  )
  .patch(
    "/equipment-costs",
    zValidator("json", updateEquipmentSchema),
    async (c) => {
      const { userId, ...data } = c.req.valid("json");
      try {
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const repository = new EquipmentCostRepository();
        const cacheRepository = new CloudflareKvCacheRepository();

        const equipmentCost = await repository.update(userId, {
          ...data,
        });

        await cacheRepository.delete(EquipmentCostCacheKeys.list(userId));

        return c.json({
          status: 200,
          success: true,
          data: equipmentCost,
        });
      } catch (error) {
        console.error("Failed to update equipment expense:", error);
        return c.json({
          status: 400,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update equipment expense",
        });
      }
    }
  );
