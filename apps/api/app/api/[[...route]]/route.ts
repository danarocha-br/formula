import { Hono } from "hono";
import { handle } from "hono/vercel";
import { expensesFixedCosts } from "./expenses-fixed-cost";

const app = new Hono().basePath("/api");

const routes = app.route("/expenses", expensesFixedCosts);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
