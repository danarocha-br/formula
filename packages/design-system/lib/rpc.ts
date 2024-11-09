import { hc } from "hono/client";
import { AppType } from "../../../apps/api/app/api/[[...route]]/route";

export const client = hc<AppType>(process.env.NEXT_PUBLIC_API_URL!);