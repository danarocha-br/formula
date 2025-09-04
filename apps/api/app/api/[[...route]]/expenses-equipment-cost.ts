import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";

import { EquipmentCostRepository } from "@repo/database";
import { EquipmentCostCacheKeys } from "@repo/database/cache-keys/equipment-cost-cache-keys";
import { RedisCacheRepository } from "@repo/database/repositories/redis-cache-repository";

const updateEquipmentSchema = z.object({
  userId: z.string(),
  name: z.string().optional(),
  amount: z.number().optional(),
  rank: z.number().optional(),
  category: z.string().optional(),
  purchaseDate: z.date().optional(),
  usage: z.number().optional(),
  lifeSpan: z.number().optional(),
});

const createEquipmentSchema = z.object({
  userId: z.string(),
  name: z.string(),
  amount: z.number(),
  rank: z.number(),
  category: z.string(),
  purchaseDate: z.date(),
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
      const cacheRepository = new RedisCacheRepository();

      const cache = await cacheRepository.get(
        EquipmentCostCacheKeys.list(userId)
      );

      if (cache && cache?.length > 0) {
        const cacheData = JSON.parse(cache);
        return c.json({ status: 200, success: true, data: cacheData });
      }

      const equipmentCosts = await repository.findByUserId(userId);

      if (equipmentCosts && equipmentCosts.length > 0) {
        await cacheRepository.set(
          EquipmentCostCacheKeys.list(userId),
          JSON.stringify(equipmentCosts)
        );
      }

      return c.json({ status: 200, success: true, data: equipmentCosts || [] });
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
      const cacheRepository = new RedisCacheRepository();

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
        const cacheRepository = new RedisCacheRepository();

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
  )
  .delete(
    "/equipment-costs/:id",
    zValidator("param", z.object({ userId: z.string(), id: z.string() })),
    async (c) => {
      const { userId, id } = c.req.valid("param");
      try {
        if (!userId) {
          throw new Error("Unauthorized");
        }

        const repository = new EquipmentCostRepository();
        const cacheRepository = new RedisCacheRepository();

        await repository.delete(Number(id));
        await cacheRepository.delete(EquipmentCostCacheKeys.list(userId));

        return c.json({
          status: 200,
          success: true,
        });
      } catch (error) {
        console.error("Failed to delete equipment expense:", error);
        return c.json({
          status: 400,
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to delete equipment expense",
        });
      }
    }
  );
