import { Redis } from "ioredis";

import { ICacheRepository } from "./dtos/cache-repository";

export class RedisCacheRepository implements ICacheRepository {
  private redis: Redis;
  constructor() {
    this.redis = new Redis(process.env.CACHE_DATABASE_URL!);
  }

  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value, "EX", 60 * 20);
  }

  async get(key: string): Promise<string | null> {
    return await this.redis.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
