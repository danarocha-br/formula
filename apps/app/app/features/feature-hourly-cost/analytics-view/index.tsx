import { useTranslations } from "@/hooks/use-translation";
import { cn } from "@repo/design-system/lib/utils";
import { cva } from "class-variance-authority";

const card = cva([
  "text-card-foreground flex flex-col justify-between gap-2 w-full h-full rounded-md p-6",
]);

export const AnalyticsView = ({ userId }: { userId: string }) => {
  const { t } = useTranslations();

  // TODO: Replace hardcoded placeholder values with real data from userId
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
            <p className="text-lg">{t("analytics.monthlyRevenue")}</p>
          </span>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between bg-card rounded-md px-3 py-6 w-full ">
              <span>{t("analytics.hourlyRate")}</span>
              <span className="font-bold text-lg">R$ 100,00</span>
            </div>
            <div className="flex justify-between bg-card rounded-md px-3 py-6 w-full ">
              <span>{t("analytics.hoursPerMonth")}</span>
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
              <p className="text-xl font-semibold">
                {t("analytics.timeDistribution")}
              </p>
            </span>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span>{t("analytics.workingDays")}</span>
                <span className="font-bold">22 {t("analytics.days")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("analytics.workingHours")}</span>
                <span className="font-bold">100 {t("analytics.hours")}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("analytics.nonWorkingHours")}</span>
                <span className="font-bold">200 {t("analytics.hours")}</span>
              </div>
            </div>
          </div>
          <div className={cn(card(), "bg-purple-300")}>
            <span>
              <h1 className="text-3xl font-bold">-50.08%</h1>
              <p className="text-lg">{t("analytics.equipmentInvestment")}</p>
            </span>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span>{t("analytics.initialCost")}</span>
                <span className="font-bold">R$ 40000</span>
              </div>
              <div className="flex justify-between">
                <span>{t("analytics.monthlyCost")}</span>
                <span className="font-bold">R$ 3000</span>
              </div>
              <div className="flex justify-between">
                <span>{t("analytics.annualROI")}</span>
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
