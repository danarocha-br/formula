import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { useDebounce } from "react-use";
import { Icon } from "@repo/design-system/components/ui/icon";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Heading } from "@repo/design-system/components/ui/heading";
import { SliderCard } from "@repo/design-system/components/ui/slider-card";
import { List } from "@repo/design-system/components/ui/list";

import { getTranslations } from "@/utils/translations";
import { ListItem } from "@/app/(authenticated)/components/list-item";
import { useCurrencyStore } from "@/app/store/currency-store";
import { useGetBillableExpenses } from "./server/get-billable-expenses";
import { useUpdateBillableExpense } from "./server/update-billable-expense";
import { useToast } from "@repo/design-system/hooks/use-toast";

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
  const { data: initialExpenses, isLoading: isLoadingExpenses } =
    useGetBillableExpenses({ userId });
  const { mutate: updateBillableExpenses } = useUpdateBillableExpense();

  const { toast } = useToast();
  const {
    control,
    watch,
    reset,
    formState: { isDirty },
  } = useForm<BillableCostsForm>({
    defaultValues: undefined,
  });

  useEffect(() => {
    if (initialExpenses) {
      // Reset form with DB values when they're available
      reset({
        work_days: initialExpenses.workDays,
        hours_per_day: initialExpenses.hoursPerDay,
        holiday_days: initialExpenses.holidaysDays,
        vacation_days: initialExpenses.vacationsDays,
        sick_leave: initialExpenses.sickLeaveDays,
        monthly_salary: initialExpenses.monthlySalary,
        taxes: initialExpenses.taxes,
        fees: initialExpenses.fees,
        margin: initialExpenses.margin,
      });
    } else {
      // Only set default values if no DB values exist
      reset({
        work_days: 5,
        hours_per_day: 6,
        holiday_days: 12,
        vacation_days: 30,
        sick_leave: 3,
        monthly_salary: 5000,
        taxes: 0,
        fees: 0,
        margin: 8,
      });
    }
  }, [initialExpenses, reset]);

  const formData = watch();

  useDebounce(
    () => {
      // Only update if the form is dirty and we're not loading
      if (!isLoadingExpenses && isDirty && formData.work_days) {
        updateBillableExpenses(
          {
            json: {
              userId: userId,
              workDays: formData.work_days,
              hoursPerDay: formData.hours_per_day,
              holidaysDays: formData.holiday_days,
              vacationsDays: formData.vacation_days,
              sickLeaveDays: formData.sick_leave,
              monthlySalary: formData.monthly_salary,
              taxes: formData.taxes,
              fees: formData.fees,
              margin: formData.margin,
            },
          },
          {
            onError: () => {
              toast({
                title: t.validation.error["update-failed"],
                variant: "destructive",
              });
            },
          }
        );
      }
    },
    500,
    [formData, isLoadingExpenses, userId, isDirty]
  );

  const calculateMetrics = (data: BillableCostsForm): Calculations => {
    const timeOff = data.holiday_days + data.vacation_days + data.sick_leave;
    const workDaysPerYear = data.work_days * 52; // 52 weeks in a year
    const actualWorkDays = workDaysPerYear - timeOff;
    const billableHours = actualWorkDays * data.hours_per_day;

    return {
      timeOff,
      actualWorkDays,
      billableHours,
    };
  };

  const calculations = calculateMetrics(formData);

  const t = getTranslations();

  const { selectedCurrency } = useCurrencyStore();

  return (
    <div className="flex flex-col py-5 px-6 h-full">
      <form className="space-y-4">
        <Heading>{t.expenses.billable.title}</Heading>

        <div className="flex gap-2 text-muted text-sm pb-2">
          <i className="mt-1 mr-4">
            <Icon name="alert" color="caption" label="alert" />
          </i>
          <p>{t.expenses.billable.subtitle}</p>
        </div>

        <div className="grid @[420px]:grid-cols-2 gap-2">
          <Controller
            control={control}
            name="work_days"
            render={({ field }) => (
              <SliderCard
                label={t.expenses.billable.form["work-days"]}
                category="calendar"
                min={1}
                max={7}
                suffix={t.expenses.billable.form["work-days-period"]}
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
                label={t.expenses.billable.form["billable-hours"]}
                category="time"
                min={1}
                max={24}
                suffix={t.expenses.billable.form["billable-hours-period"]}
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
                label={t.expenses.billable.form["holidays"]}
                category="flag"
                min={1}
                max={360}
                suffix={t.expenses.billable.form["holidays-period"]}
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
                label={t.expenses.billable.form["vacations"]}
                category="holiday"
                min={1}
                max={360}
                suffix={t.expenses.billable.form["vacations-period"]}
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
                label={t.expenses.billable.form["sick-leave"]}
                category="pill"
                min={1}
                max={360 / 2}
                suffix={t.expenses.billable.form["sick-leave-period"]}
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
                label={t.expenses.billable.form["monthly-salary"]}
                category="wallet"
                currency={selectedCurrency.symbol}
                min={1}
                max={100000}
                suffix={t.expenses.billable.form["monthly-salary-period"]}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
        </div>

        <Heading className="pt-3">{t.expenses.billable.taxes.title}</Heading>

        <div className="flex gap-2 text-muted text-sm pb-2">
          <i className="mt-1 mr-4">
            <Icon name="alert" color="caption" label="alert" />
          </i>
          <p>{t.expenses.billable.taxes.subtitle}</p>
        </div>

        <div className="grid @[420px]:grid-cols-2 gap-2">
          <Controller
            control={control}
            name="taxes"
            render={({ field }) => (
              <SliderCard
                label={t.expenses.billable.form.taxes}
                category="percent"
                min={0}
                max={100}
                suffix={`% ${t.expenses.billable.form["monthly-salary-period"]}`}
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
                label={t.expenses.billable.form.fees}
                category="percent"
                min={0}
                max={100}
                suffix={`% ${t.expenses.billable.form["monthly-salary-period"]}`}
                loading={isLoadingExpenses}
                {...field}
              />
            )}
          />
        </div>

        <Heading className="pt-3">{t.expenses.billable.margin.title}</Heading>

        <div className="flex gap-2 text-muted text-sm pb-2">
          <i className="mt-1 mr-4">
            <Icon name="alert" color="caption" label="alert" />
          </i>
          <p>{t.expenses.billable.margin.subtitle}</p>
        </div>

        <Controller
          control={control}
          name="margin"
          render={({ field }) => (
            <SliderCard
              label={t.expenses.billable.form.margin}
              category="trend-up"
              min={0}
              max={100}
              suffix={`% ${t.expenses.billable.form["monthly-salary-period"]}`}
              loading={isLoadingExpenses}
              {...field}
            />
          )}
        />
      </form>

      <Heading className="mt-6 mb-4">
        {t.expenses.billable.summary.title}
      </Heading>

      <List.Root className={"mb-5"}>
        <ListItem
          icon="time-off"
          title={t.expenses.billable.form["time-off"]}
          data={
            <>
              <b>{calculations.timeOff.toString()}</b>{" "}
              {t.expenses.billable.form["time-off-period"]}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>{t.expenses.billable.form["holidays"]}</Badge>+
              <Badge>{t.expenses.billable.form["vacations"]}</Badge>+
              <Badge>{t.expenses.billable.form["sick-leave"]}</Badge>
            </div>
          }
        />
        <ListItem
          icon="calendar"
          title={t.expenses.billable.form["actual-work-days"]}
          data={
            <>
              <b>{calculations.actualWorkDays.toString()}</b>{" "}
              {t.expenses.billable.form["actual-work-days-period"]}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>
                {t.expenses.billable.form["work-days"] +
                  " " +
                  t.expenses.billable.form["holidays-period"]}
              </Badge>
              -
              <Badge>
                {t.expenses.billable.form["time-off"] +
                  " " +
                  t.expenses.billable.form["holidays-period"]}
              </Badge>
            </div>
          }
        />
        <ListItem
          className="border-b-0"
          icon="work"
          title={t.expenses.billable.form["billable-hours"]}
          data={
            <>
              <b>{calculations.billableHours.toString()}</b>{" "}
              {t.expenses.billable.form["billable-hours-period"]}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>{t.expenses.billable.form["work-days"]}</Badge>*
              <Badge>{t.expenses.billable.form["billable-hours"]}</Badge>
            </div>
          }
        />
      </List.Root>
    </div>
  );
};
