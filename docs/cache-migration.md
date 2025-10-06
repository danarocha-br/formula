# Cache System Overview

## Cache Provider
- The API now relies on [Cloudflare Workers KV](https://developers.cloudflare.com/workers/wrangler/workers-kv/) for key-value caching through the `CloudflareKvCacheRepository`.【F:packages/database/repositories/cloudflare-kv-cache-repository.ts†L1-L94】
- Configuration requires three environment variables: `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_KV_NAMESPACE`, and `CLOUDFLARE_KV_API_TOKEN`. They are read during repository construction and throw if absent to fail fast during boot.【F:packages/database/repositories/cloudflare-kv-cache-repository.ts†L10-L33】

## Behaviour
- Cached entries are stored for 20 minutes using the `expiration_ttl` query parameter exposed by the Cloudflare KV REST API, mirroring the previous Redis TTL.【F:packages/database/repositories/cloudflare-kv-cache-repository.ts†L15-L47】
- Reads translate 404 responses into cache misses and surface other HTTP errors with descriptive messages to aid debugging.【F:packages/database/repositories/cloudflare-kv-cache-repository.ts†L49-L75】
- Delete operations ignore missing keys while surfacing other HTTP errors to keep invalidation idempotent.【F:packages/database/repositories/cloudflare-kv-cache-repository.ts†L77-L94】

## Usage in the API
- The expenses and webhook routes instantiate the Cloudflare-backed repository on demand and continue to use the shared cache key helpers for consistent key formatting.【F:apps/api/app/api/[[...route]]/expenses-billable-cost.ts†L5-L83】【F:apps/api/app/api/[[...route]]/expenses-fixed-cost.ts†L5-L83】【F:apps/api/app/api/[[...route]]/expenses-equipment-cost.ts†L6-L83】【F:apps/api/app/webhooks/clerk/route.ts†L9-L153】
- The `keep-alive` cron route also writes a heartbeat entry into KV to keep the namespace warm.【F:apps/api/app/cron/keep-alive/route.ts†L1-L11】

## Operational Notes
- Ensure the Cloudflare API token is scoped to the relevant KV namespace and stored securely.
- Because Workers KV is eventually consistent across regions, expect writes to take up to a minute to propagate globally. Critical reads should handle short-lived stale data appropriately.
