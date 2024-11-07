import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { Icon } from '@repo/design-system/components/ui/icon';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Heading } from '@repo/design-system/components/ui/heading';
import { SliderCard } from '@repo/design-system/components/ui/slider-card';
import { List } from '@repo/design-system/components/ui/list';
import { ListItem } from '../../components/list-item';
import { getTranslations } from '@/utils/translations';


type BillableCostsForm = {
  work_days: number;
  hours_per_day: number;
  holiday_days: number;
  vacation_days: number;
  sick_leave: number;
  monthly_salary: number;
};

type Calculations = {
  timeOff: number;
  actualWorkDays: number;
  billableHours: number;
};

export const BillableCosts = () => {
  const defaultValues: BillableCostsForm = {
    work_days: 5,
    hours_per_day: 6,
    holiday_days: 12,
    vacation_days: 30,
    sick_leave: 3,
    monthly_salary: 5000,
  };
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BillableCostsForm>({
    defaultValues,
  });

  const onSubmit: SubmitHandler<BillableCostsForm> = (data) =>
    console.log(data);

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

  const formData = watch();
  const calculations = calculateMetrics(formData);

  const t = getTranslations()

  return (
    <div className="flex flex-col py-5 px-6 h-full">
      <Heading>{t.expenses.billable.title}</Heading>
      <div className="flex gap-2 text-text-color-caption text-sm mb-7">
        <i className="mt-1 mr-4">
          <Icon name="alert" color="caption" label="alert" />
        </i>
        <p>{t.expenses.billable.subtitle}</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid @[420px]:grid-cols-2 gap-2"
      >
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
              currency={t.common['currency-symbol'] + " "}
              min={1}
              max={100000}
              suffix={t.expenses.billable.form["monthly-salary-period"]}
              {...field}
            />
          )}
        />
      </form>

      <List.Root className={"mt-5"}>
        <ListItem
          icon="time-off"
          title={t.expenses.billable.form["time-off"]}
          data={
            <>
              <b>{calculations.timeOff}</b>{" "}
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
              <b>{calculations.actualWorkDays}</b>{" "}
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
              <b>{calculations.billableHours}</b> {t.expenses.billable.form["billable-hours-period"]}
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>{t.expenses.billable.form["work-days"]}</Badge>*<Badge>{t.expenses.billable.form["billable-hours"]}</Badge>
            </div>
          }
        />
      </List.Root>
    </div>
  );
};
