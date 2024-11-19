import { cn } from "@repo/design-system/lib/utils";
import { cva } from "class-variance-authority";
import React from "react";

const card = cva(["text-card-foreground flex flex-col justify-between gap-2 w-full h-full rounded-md p-6"]);

export const AnalyticsView = ({ userId }: { userId: string }) => {
  return (
    <section>
      <div className="grid w-full gap-2 grid-cols-4 ">
        <div
          className={cn(
            card(),
            "bg-gradient-to-br from-yellow-400 to-purple-100 min-h-[420px]"
          )}
        >
          <span>
            <h1 className="text-3xl font-bold">R$ 15,400</h1>
            <p className="text-lg">Monthly Revenue</p>
          </span>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between bg-card rounded-md px-3 py-6 w-full ">
              <span>Hourly Rate:</span>
              <span className="font-bold text-lg">R$ 100,00</span>
            </div>
            <div className="flex justify-between bg-card rounded-md px-3 py-6 w-full ">
              <span>Hours per month:</span>
              <span className="font-bold text-lg">1000</span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            card(),
            "bg-gradient-to-b from-neutral-400 to-purple-50"
          )}
        >
          a
        </div>

        <div className="gap-2 w-full col-span-2 grid grid-cols-2 grid-rows-2 row-span-1">
          <div className={cn(card(), "bg-yellow-300")}>
            <span>
              {/* <h1 className="text-3xl font-bold">R$ 15,400</h1> */}
              <p className="text-xl font-semibold">Time distribution</p>
            </span>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Working Days</span>
                <span className="font-bold">22 days</span>
              </div>
              <div className="flex justify-between">
                <span>Working Hours</span>
                <span className="font-bold">100 h</span>
              </div>
              <div className="flex justify-between">
                <span>Non-Working Hours</span>
                <span className="font-bold">200 h</span>
              </div>
            </div>
          </div>
          <div className={cn(card(), "bg-purple-300")}>
            <span>
              <h1 className="text-3xl font-bold">-50.08%</h1>
              <p className="text-lg">Equipment Investment</p>
            </span>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Initial Cost</span>
                <span className="font-bold">R$ 40000</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Cost</span>
                <span className="font-bold">R$ 3000</span>
              </div>
              <div className="flex justify-between">
                <span>Annual ROI</span>
                <span className="font-bold text-green-600">40%</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 w-full h-full bg-white rounded-md col-span-2">
            a
          </div>
        </div>

        <div className="flex flex-col col-span-3 gap-2 w-full h-80 bg-white rounded-md">
          a
        </div>
        <div className="flex flex-col gap-2 w-full h-80 bg-yellow-300 rounded-md">
          a
        </div>
      </div>
    </section>
  );
};
