import { Hono } from "hono";
import { handle } from "hono/vercel";
import { expensesFixedCosts } from "./expenses-fixed-cost";
import { expensesBillableCosts } from './expenses-billable-cost';
import { expensesEquipmentCosts } from './expenses-equipment-cost';

const app = new Hono().basePath("/api");

const routes = app
  .route("/expenses", expensesFixedCosts)
  .route("/expenses", expensesBillableCosts)
  .route("/expenses", expensesEquipmentCosts);

export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

export type AppType = typeof routes;
