import { Hono } from "hono";
import { handle } from "hono/vercel";

const app = new Hono().basePath("/api");

app.get("/health", async (c) => {
  return c.json({ status: "OK" });
});

export const GET = handle(app);
