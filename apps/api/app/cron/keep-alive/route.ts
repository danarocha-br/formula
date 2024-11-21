import { database } from "@repo/database";
import { RedisCacheRepository } from '@repo/database/repositories/redis-cache-repository';
import { NextResponse } from "next/server";

export const POST = async () => {
  const cacheRepository = new RedisCacheRepository();

  await cacheRepository.set("keep-alive", "keep-alive");
  const pages = await database.expensesFixedCost.count();

  return NextResponse.json({ status: 200, success: true });
};
