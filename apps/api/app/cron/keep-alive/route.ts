import { database } from "@repo/database";
import { CloudflareKvCacheRepository } from "@repo/database/repositories/cloudflare-kv-cache-repository";
import { NextResponse } from "next/server";

export const POST = async () => {
  const cacheRepository = new CloudflareKvCacheRepository();

  await cacheRepository.set("keep-alive", "keep-alive");
  const pages = await database.expensesFixedCost.count();

  return NextResponse.json({ status: 200, success: true });
};
