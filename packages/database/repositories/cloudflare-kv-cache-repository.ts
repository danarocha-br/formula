import { fetch } from "undici";

import { ICacheRepository } from "./dtos/cache-repository";

const TWENTY_MINUTES_IN_SECONDS = 60 * 20;

const missingEnvError =
  "Missing Cloudflare KV configuration. Ensure CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_KV_NAMESPACE, and CLOUDFLARE_KV_API_TOKEN are set.";

export class CloudflareKvCacheRepository implements ICacheRepository {
  private readonly baseUrl: string;
  private readonly authorizationHeader: string;

  constructor() {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const namespaceId = process.env.CLOUDFLARE_KV_NAMESPACE;
    const apiToken = process.env.CLOUDFLARE_KV_API_TOKEN;

    if (!accountId || !namespaceId || !apiToken) {
      throw new Error(missingEnvError);
    }

    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}`;
    this.authorizationHeader = `Bearer ${apiToken}`;
  }

  async set(key: string, value: string): Promise<void> {
    const url = new URL(
      `${this.baseUrl}/values/${encodeURIComponent(key)}`
    );
    url.searchParams.set("expiration_ttl", `${TWENTY_MINUTES_IN_SECONDS}`);

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: this.authorizationHeader,
        "Content-Type": "text/plain",
      },
      body: value,
    });

    if (!response.ok) {
      const detail = await this.readErrorMessage(response);
      throw new Error(`Cloudflare KV set failed (${response.status}): ${detail}`);
    }
  }

  async get(key: string): Promise<string | null> {
    const url = `${this.baseUrl}/values/${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      headers: {
        Authorization: this.authorizationHeader,
      },
    });

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const detail = await this.readErrorMessage(response);
      throw new Error(`Cloudflare KV get failed (${response.status}): ${detail}`);
    }

    return await response.text();
  }

  async delete(key: string): Promise<void> {
    const url = `${this.baseUrl}/values/${encodeURIComponent(key)}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: this.authorizationHeader,
      },
    });

    if (!response.ok && response.status !== 404) {
      const detail = await this.readErrorMessage(response);
      throw new Error(
        `Cloudflare KV delete failed (${response.status}): ${detail}`
      );
    }
  }

  private async readErrorMessage(response: Response): Promise<string> {
    try {
      const body = await response.text();
      return body || response.statusText;
    } catch (error) {
      if (error instanceof Error) {
        return error.message;
      }
      return response.statusText;
    }
  }
}
