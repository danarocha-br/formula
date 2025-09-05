import { ListItem } from "@/app/(authenticated)/components/list-item";
import { useCurrencyStore } from "@/app/store/currency-store";
import { useHourlyCostStore } from "@/app/store/hourly-cost-store";
import { useBreakEvenCalculator } from "@/hooks/use-break-even-calculator";
import { useStableBillable } from "@/hooks/use-stable-billable";
import { useTranslations } from "@/hooks/use-translation";
import { formatCurrency } from "@/utils/format-currency";
import { useExpenseComponentSafeguards } from "@/utils/use-effect-safeguards";
import { useMemoryLeakDetection } from "@/utils/memory-leak-detection";
import { useRenderFrequencyMonitor } from "@/utils/re-render-monitoring";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Heading } from "@repo/design-system/components/ui/heading";
import { Icon } from "@repo/design-system/components/ui/icon";
import { List } from "@repo/design-system/components/ui/list";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { useCallback, useMemo, useRef, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDebounce } from "react-use";
import { useUpdateBillableExpense } from "./server/update-billable-expense";

type BillableCostsForm = {
  work_days: number;
  hours_per_day: number;
  holiday_days: number;
  vacation_days: number;
  sick_leave: number;
  monthly_salary: number;
  taxes: number;
  margin: number;
  fees: number;
};

type Calculations = {
  timeOff: number;
  actualWorkDays: number;
  billableHours: number;
};



export const BillableCosts = ({ userId }: { userId: string }) => {
  // Performance safeguards for billable cost feature
  const {
    shouldExecuteMutation,
    trackMutation,
    isComponentHealthy,
    healthReport,
  } = useExpenseComponentSafeguards('BillableCosts', 'billable-expenses', {
    maxRenders: 50,
    maxMutations: 3,
    enableMemoryTracking: true,
  });

  // Memory leak detection
  const { registerCleanup } = useMemoryLeakDetection('BillableCosts');

  // Render frequency monitoring
  const { isExcessive } = useRenderFrequencyMonitor('BillableCosts');

  // Use stable data selector for billable cost data
  const {
    billableData: initialExpenses,
    isLoading: isLoadingExpenses,
    isError,
    error
  } = useStableBillable({ userId });

  const { mutate: updateBillableExpenses } = useUpdateBillableExpense();
  const { t } = useTranslations();
  const { toast } = useToast();

  const { selectedCurrency } = useCurrencyStore();
  const { setHourlyCost, totalMonthlyExpenses } = useHourlyCostStore();
  const {
    control,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<BillableCostsForm>({
    defaultValues: {
      work_days: 5,
      hours_per_day: 6,
      holiday_days: 12,
      vacation_days: 30,
      sick_leave: 3,
      monthly_salary: 0,
      taxes: 0,
      fees: 0,
      margin: 0,
    },
  });

  const formData = watch();
  const hasResetRef = useRef(false);

  // Effect for form reset - using stable billable data
  useEffect(() => {
    if (initialExpenses && !isLoadingExpenses && !hasResetRef.current) {
      // Only reset form once when data is first loaded
      const currentFormData = {
        work_days: initialExpenses.workDays,
        hours_per_day: initialExpenses.hoursPerDay,
        holiday_days: initialExpenses.holidaysDays,
        vacation_days: initialExpenses.vacationsDays,
        sick_leave: initialExpenses.sickLeaveDays,
        monthly_salary: initialExpenses.monthlySalary,
        taxes: initialExpenses.taxes,
        fees: initialExpenses.fees,
        margin: initialExpenses.margin,
      };

      console.log('Resetting form with billable data:', currentFormData);
      reset(currentFormData);
      hasResetRef.current = true;
    }
  }, [
    initialExpenses?.workDays,
    initialExpenses?.hoursPerDay,
    initialExpenses?.holidaysDays,
    initialExpenses?.vacationsDays,
    initialExpenses?.sickLeaveDays,
    initialExpenses?.monthlySalary,
    initialExpenses?.taxes,
    initialExpenses?.fees,
    initialExpenses?.margin,
    isLoadingExpenses,
    reset,
  ]);

  const calculateMetrics = useCallback(
    (data: BillableCostsForm): Calculations => {
      // Provide fallbacks for undefined values
      const workDays = data?.work_days || 5;
      const hoursPerDay = data?.hours_per_day || 6;
      const holidayDays = data?.holiday_days || 12;
      const vacationDays = data?.vacation_days || 30;
      const sickLeave = data?.sick_leave || 3;

      const timeOff = holidayDays + vacationDays + sickLeave;
      const workDaysPerYear = workDays * 52;
      const actualWorkDays = Math.max(0, workDaysPerYear - timeOff); // Ensure non-negative
      const billableHours = Math.max(0, actualWorkDays * hoursPerDay); // Ensure non-negative

      return {
        timeOff,
        actualWorkDays,
        billableHours,
      };
    },
    []
  );

  // Use stable reference for form data to prevent unnecessary recalculations
  const stableFormData = useMemo(() => formData, [
    formData.work_days,
    formData.hours_per_day,
    formData.holiday_days,
    formData.vacation_days,
    formData.sick_leave,
    formData.monthly_salary,
    formData.taxes,
    formData.fees,
    formData.margin,
  ]);

  const hourlyCalculations = useMemo(
    () => calculateMetrics(stableFormData),
    [
      calculateMetrics,
      stableFormData.work_days,
      stableFormData.hours_per_day,
      stableFormData.holiday_days,
      stableFormData.vacation_days,
      stableFormData.sick_leave,
    ]
  );



  // Debounced updates with optimized cache management
  useDebounce(
    () => {
      if (
        !isLoadingExpenses &&
        isDirty &&
        stableFormData.work_days &&
        initialExpenses !== null &&
        shouldExecuteMutation('update')
      ) {
        // Create payload inside the debounced function to avoid dependency issues
        const currentUpdatePayload = {
          json: {
            userId: userId,
            workDays: stableFormData.work_days,
            hoursPerDay: stableFormData.hours_per_day,
            holidaysDays: stableFormData.holiday_days,
            vacationsDays: stableFormData.vacation_days,
            sickLeaveDays: stableFormData.sick_leave,
            monthlySalary: stableFormData.monthly_salary,
            taxes: stableFormData.taxes,
            fees: stableFormData.fees,
            margin: stableFormData.margin,
            billableHours: hourlyCalculations.billableHours,
          },
        };

        console.log('Updating billable expenses with optimized cache management:', currentUpdatePayload);
        trackMutation('update');

        updateBillableExpenses(currentUpdatePayload, {
          onSuccess: (data) => {
            console.log('Successfully updated billable expenses with precise cache updates:', data);
          },
          onError: (error) => {
            console.error('Failed to update billable expenses:', error);
            toast({
              title: t("validation.error.update-failed"),
              variant: "destructive",
            });
          },
        });
      }
    },
    1000,
[
      stableFormData.work_days,
      stableFormData.hours_per_day,
      stableFormData.holiday_days,
      stableFormData.vacation_days,
      stableFormData.sick_leave,
      stableFormData.monthly_salary,
      stableFormData.taxes,
      stableFormData.fees,
      stableFormData.margin,
      hourlyCalculations.billableHours,
      isLoadingExpenses,
      userId,
      isDirty,
      shouldExecuteMutation,
      trackMutation,
      updateBillableExpenses,
      toast,
      t,
    ]
  );

  const breakEvenMetrics = useMemo(
    () =>
      useBreakEvenCalculator({
        billableHours: hourlyCalculations.billableHours,
        monthlySalary: stableFormData.monthly_salary,
        taxRate: stableFormData.taxes,
        fees: stableFormData.fees,
        margin: stableFormData.margin,
        totalExpensesCostPerMonth: totalMonthlyExpenses,
        hoursPerDay: stableFormData.hours_per_day,
        workDays: stableFormData.work_days,
      }),
    [
      hourlyCalculations.billableHours,
      stableFormData.monthly_salary,
      stableFormData.taxes,
      stableFormData.fees,
      stableFormData.margin,
      stableFormData.hours_per_day,
      stableFormData.work_days,
      totalMonthlyExpenses,
    ]
  );

  // Effect for setting hourly cost
  useEffect(() => {
    setHourlyCost(breakEvenMetrics.hourlyRate);

    // Register cleanup to reset hourly cost if component unmounts
    const cleanup = registerCleanup(() => {
      console.log('Cleaning up BillableCosts component');
    });

    return cleanup;
  }, [breakEvenMetrics.hourlyRate, setHourlyCost, registerCleanup]);

  // Handle errors from stable data selector
  useEffect(() => {
    if (isError && error) {
      console.error('Error loading billable cost data:', error);
      toast({
        title: t("validation.error.load-failed"),
        description: error.message,
        variant: "destructive",
      });
    }
  }, [isError, error, toast, t]);

  // Log component health in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && (!isComponentHealthy || isExcessive)) {
      console.warn('BillableCosts component health warning:', {
        isComponentHealthy,
        isExcessive,
        healthReport,
        stableDataError: isError ? error?.message : null,
      });
    }
  }, [isComponentHealthy, isExcessive, healthReport, isError, error]);

  return (
    <div className="flex h-full flex-col px-6 py-5">
      <form className="space-y-4">
        <Heading>{t("expenses.billable.title")}</Heading>

        <div className="flex gap-2 pb-2 text-muted text-sm">
          <i className="mt-1 mr-4">
            <Icon name="alert" color="caption" label={t("common.accessibility.alert")} />
          </i>
          <p>{t("expenses.billable.subtitle")}</p>
        </div>

        <div className="grid @[420px]:grid-cols-2 gap-2">
          <Controller
            control={control}
            name="work_days"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.work-days")}
                category="calendar"
                min={1}
                max={7}
                suffix={t("expenses.billable.form.work-days-period")}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="hours_per_day"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.billable-hours")}
                category="time"
                min={1}
                max={24}
                suffix={t("expenses.billable.form.billable-hours-period")}
                {...field}
                loading={isLoadingExpenses}
              />
            )}
          />
          <Controller
            control={control}
            name="holiday_days"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.holidays")}
                category="flag"
                min={1}
                max={360}
                suffix={t("expenses.billable.form.holidays-period")}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="vacation_days"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.vacations")}
                category="holiday"
                min={1}
                max={360}
                suffix={t("expenses.billable.form.vacations-period")}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="sick_leave"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.sick-leave")}
                category="pill"
                min={1}
                max={360 / 2}
                suffix={t("expenses.billable.form.sick-leave-period")}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="monthly_salary"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.monthly-salary")}
                category="wallet"
                currency={selectedCurrency.symbol}
                min={1}
                max={100000}
                suffix={t("expenses.billable.form.monthly-salary-period")}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
        </div>

        <Heading className="pt-3">{t("expenses.billable.taxes.title")}</Heading>

        <div className="flex gap-2 pb-2 text-muted text-sm">
          <i className="mt-1 mr-4">
            <Icon name="alert" color="caption" label={t("common.accessibility.alert")} />
          </i>
          <p>{t("expenses.billable.taxes.subtitle")}</p>
        </div>

        <div className="grid @[420px]:grid-cols-2 gap-2">
          <Controller
            control={control}
            name="taxes"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.taxes")}
                category="percent"
                min={0}
                max={100}
                suffix={`% ${t("expenses.billable.form.monthly-salary-period")}`}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
          <Controller
            control={control}
            name="fees"
            render={({ field }) => (
              <SliderCard
                label={t("expenses.billable.form.fees")}
                category="percent"
                min={0}
                max={100}
                suffix={`% ${t("expenses.billable.form.monthly-salary-period")}`}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
        </div>

        <Heading className="pt-3">
          {t("expenses.billable.margin.title")}
        </Heading>

        <div className="flex gap-2 pb-2 text-muted text-sm">
          <i className="mt-1 mr-4">
            <Icon name="alert" color="caption" label={t("common.accessibility.alert")} />
          </i>
          <p>{t("expenses.billable.margin.subtitle")}</p>
        </div>

        <Controller
          control={control}
          name="margin"
          render={({ field }) => (
            <SliderCard
              label={t("expenses.billable.form.margin")}
              category="trend-up"
              min={0}
              max={100}
              suffix={`% ${t("expenses.billable.form.monthly-salary-period")}`}
              loading={isLoadingExpenses}
              {...field}
            />
          )}
        />
      </form>

      <Heading className="mt-6 mb-4">
        {t("expenses.billable.summary.title")}
      </Heading>

      <List.Root className={"mb-5"}>
        <ListItem
          icon="time-off"
          title={t("expenses.billable.form.time-off")}
          data={
            <>
              <b>{hourlyCalculations.timeOff.toString()}</b>{" "}
              {t("expenses.billable.form.time-off-period")}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>{t("expenses.billable.form.holidays")}</Badge>+
              <Badge>{t("expenses.billable.form.vacations")}</Badge>+
              <Badge>{t("expenses.billable.form.sick-leave")}</Badge>
            </div>
          }
        />
        <ListItem
          icon="calendar"
          title={t("expenses.billable.form.actual-work-days")}
          data={
            <>
              <b>{hourlyCalculations.actualWorkDays.toString()}</b>{" "}
              {t("expenses.billable.form.actual-work-days-period")}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>
                {t("expenses.billable.form.work-days") +
                  " " +
                  t("expenses.billable.form.holidays-period")}
              </Badge>
              -
              <Badge>
                {t("expenses.billable.form.time-off") +
                  " " +
                  t("expenses.billable.form.holidays-period")}
              </Badge>
            </div>
          }
        />
        <ListItem
          className="border-b-0"
          icon="work"
          title={t("expenses.billable.form.billable-hours")}
          data={
            <>
              <b>{hourlyCalculations.billableHours.toString()}</b>{" "}
              {t("expenses.billable.form.billable-hours-summary-period")}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>{t("expenses.billable.form.work-days")}</Badge>*
              <Badge>{t("expenses.billable.form.billable-hours")}</Badge>
            </div>
          }
        />
      </List.Root>

      <List.Root className="mb-5">
        <ListItem
          icon="money-up"
          title={t("expenses.billable.breakeven.hourly-rate")}
          data={
            <>
              <b>
                {formatCurrency(breakEvenMetrics.hourlyRate, {
                  currency: selectedCurrency.code,
                })}
              </b>{" "}
              {t("expenses.billable.breakeven.per-hour")}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>
                {t("expenses.billable.breakeven.break-even") + " "}
              </Badge>{" "}
              /{" "}
              <Badge>{t("expenses.billable.form.billable-hours") + " "}</Badge>
            </div>
          }
        />
        <ListItem
          icon="money-up"
          title={t("expenses.billable.breakeven.day-rate")}
          data={
            <>
              <b>
                {formatCurrency(breakEvenMetrics.dayRate, {
                  currency: selectedCurrency.code,
                })}
              </b>{" "}
              {t("expenses.billable.breakeven.per-day")}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>
                {t("expenses.billable.breakeven.hourly-rate") + " "}
              </Badge>{" "}
              * <Badge> {t("expenses.billable.form.billable-hours")}</Badge>
            </div>
          }
        />
        <ListItem
          icon="money-up"
          title={t("expenses.billable.breakeven.week-rate")}
          data={
            <>
              <b>
                {formatCurrency(breakEvenMetrics.weekRate, {
                  currency: selectedCurrency.code,
                })}
              </b>{" "}
              {t("expenses.billable.breakeven.per-week")}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>
                {t("expenses.billable.breakeven.day-rate") + " "}
              </Badge> *{" "}
              <Badge> {t("expenses.billable.form.billable-hours")}</Badge>
            </div>
          }
        />
        <ListItem
          className="border-b-0"
          icon="money-up"
          title={t("expenses.billable.breakeven.monthly-rate")}
          data={
            <>
              <b>
                {formatCurrency(breakEvenMetrics.monthlyRate, {
                  currency: selectedCurrency.code,
                })}
              </b>{" "}
              {t("expenses.billable.breakeven.per-month")}
            </>
          }
          itemsOnHover={
            <div className="flex items-center gap-1">
              <span className="mr-2">=</span>
              <Badge>
                {t("expenses.billable.breakeven.hourly-rate") + " "}
              </Badge>{" "}
              * <Badge> {t("expenses.billable.form.billable-hours")}</Badge>
              <span className="text-sm">/ 12</span>
            </div>
          }
        />
      </List.Root>
    </div>
  );
};
