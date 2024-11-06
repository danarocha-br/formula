import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { Icon } from '@repo/design-system/components/ui/icon';
import { Badge } from '@repo/design-system/components/ui/badge';
import { Heading } from '@repo/design-system/components/ui/heading';
import { SliderCard } from '@repo/design-system/components/ui/slider-card';
import { List } from '@repo/design-system/components/ui/list';
import { ListItem } from '../../components/list-item';


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

  return (
    <div className="flex flex-col py-5 px-6 h-full">
      <Heading>Billable costs</Heading>
      <div className="flex gap-2 text-text-color-caption text-sm mb-7">
        <i className="mt-1 mr-4">
          <Icon name="alert" color="caption" label="alert" />
        </i>
        <p>
          A general rule of thumb is to assume that around <b>75%</b> of your
          working day will be spent on billable tasks. This means if you have an
          8-hour workday, you can realistically estimate <b>6 billable hours</b>
          .
        </p>
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
              label="Work days"
              category="calendar"
              min={1}
              max={7}
              suffix="days per week"
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="hours_per_day"
          render={({ field }) => (
            <SliderCard
              label="Billable hours"
              category="time"
              min={1}
              max={24}
              suffix="hours per day"
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="holiday_days"
          render={({ field }) => (
            <SliderCard
              label="National holidays"
              category="flag"
              min={1}
              max={360}
              suffix="days per year"
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="vacation_days"
          render={({ field }) => (
            <SliderCard
              label="Vacations"
              category="holiday"
              min={1}
              max={360}
              suffix="days per year"
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="sick_leave"
          render={({ field }) => (
            <SliderCard
              label="Sick leave"
              category="pill"
              min={1}
              max={360 / 2}
              suffix="days per year"
              {...field}
            />
          )}
        />
        <Controller
          control={control}
          name="monthly_salary"
          render={({ field }) => (
            <SliderCard
              label="Monthly salary"
              category="wallet"
              currency="$"
              min={1}
              max={100000}
              suffix="per month"
              {...field}
            />
          )}
        />
      </form>

      <List.Root className={"mt-5"}>
        <ListItem
          icon="time-off"
          title="Time off"
          data={
            <>
              <b>{calculations.timeOff}</b> days per year
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>Holidays</Badge>+<Badge>Vacations</Badge>+
              <Badge>Sick leave</Badge>
            </div>
          }
        />
        <ListItem
          icon="calendar"
          title="Actual work days"
          data={
            <>
              <b>{calculations.actualWorkDays}</b> days per year
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>Work days per year</Badge>-<Badge>Time off</Badge>
            </div>
          }
        />
        <ListItem
          className="border-b-0"
          icon="work"
          title="Billable hours"
          data={
            <>
              <b>{calculations.billableHours}</b> hours per year
            </>
          }
          itemsOnHover={
            <div className="flex gap-1">
              <span className="mr-2">=</span>
              <Badge>Actual work days</Badge>*<Badge>Billable hours</Badge>
            </div>
          }
        />
      </List.Root>
    </div>
  );
};
