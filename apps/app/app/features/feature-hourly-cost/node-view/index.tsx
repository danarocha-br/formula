import { useEffect, useCallback, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  Connection,
  Edge,
  Node,
  addEdge,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Position,
} from "reactflow";
import "reactflow/dist/style.css";
import { useDebounce } from "react-use";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { InputNode } from "@repo/design-system/components/ui/nodes/input-node";
import { GroupNode } from "@repo/design-system/components/ui/nodes/group-node";
import { CalculationNode } from "@repo/design-system/components/ui/nodes/calculation-node";
import { OutputNode } from "@repo/design-system/components/ui/nodes/output-node";
import { useToast } from "@repo/design-system/hooks/use-toast";
import { getTranslations } from "@/utils/translations";
import { useHourlyCostStore } from "@/app/store/hourly-cost-store";
import { useBreakEvenCalculator } from "@/hooks/use-break-even-calculator";
import { useCurrencyStore } from "@/app/store/currency-store";
import { useGetBillableExpenses } from "../../feature-billable-cost/server/get-billable-expenses";
import { useUpdateBillableExpense } from "../../feature-billable-cost/server/update-billable-expense";
import { useCreateBillableExpense } from "../../feature-billable-cost/server/create-billable-expense";
import { ExpenseItem } from '@/app/types';

const nodeTypes: NodeTypes = {
  input: InputNode as any,
  calculation: CalculationNode as any,
  output: OutputNode as any,
  group: GroupNode as any,
};

type NodeViewProps = {
  userId: string;
  expenses: ExpenseItem[];
};

type FormValues = z.infer<typeof formSchema>;

interface CalculatedMetrics {
  timeOff: number;
  actualWorkDays: number;
  billableHours: number;
  hourlyRate: number;
}

interface NodeCalculations {
  metrics: CalculatedMetrics;
  nodes: Node[];
}

const formSchema = z.object({
  work_days: z.number().min(1).max(7),
  hours_per_day: z.number().min(1).max(24),
  monthly_salary: z.number().min(0),
  holiday_days: z.number().min(0).max(365),
  vacation_days: z.number().min(0).max(365),
  sick_leave: z.number().min(0).max(365),
  taxes: z.number().min(0).max(100),
  fees: z.number().min(0).max(100),
  margin: z.number().min(0).max(100),
});

export const NodeView = ({ userId }: NodeViewProps) => {
  const { data: initialExpenses, isLoading: isLoadingExpenses } =
    useGetBillableExpenses({ userId });
  const { mutate: updateBillableExpenses } = useUpdateBillableExpense();
  const { mutate: createBillableExpenses } = useCreateBillableExpense();
  const { toast } = useToast();
  const t = getTranslations();
  const { setHourlyCost, totalMonthlyExpenses } = useHourlyCostStore();
  const { selectedCurrency } = useCurrencyStore();

  const calculateNodesAndMetrics = (data: FormValues): NodeCalculations => {
    // Calculate all metrics once
    const timeOff = data.holiday_days + data.vacation_days + data.sick_leave;
    const workDaysPerYear = data.work_days * 52;
    const actualWorkDays = workDaysPerYear - timeOff;
    const billableHours = actualWorkDays * data.hours_per_day;

    const breakEvenMetrics = useBreakEvenCalculator({
      billableHours,
      monthlySalary: data.monthly_salary,
      taxRate: data.taxes,
      fees: data.fees,
      margin: data.margin,
      totalExpensesCostPerMonth: totalMonthlyExpenses,
      hoursPerDay: data.hours_per_day,
      workDays: data.work_days,
    });

    const metrics = {
      timeOff,
      actualWorkDays,
      billableHours,
      hourlyRate: breakEvenMetrics.hourlyRate,
    };

    // Create nodes using the pre-calculated metrics
    const nodes = [
      // Input nodes group
      {
        id: "work_days",
        type: "input",
        position: { x: 100, y: 0 },
        data: {
          label: t.expenses.billable.form["work-days"],
          suffix: t.expenses.billable.form["work-days-period"],
          value: data.work_days,
          onChange: (value: number) => handleNodeChange("work_days", value),
          max: 7,
          min: 1,
          error: form.formState.errors.work_days?.message,
          icon: "calendar",
          description: "Estime quantos dias por semana você trabalha.",
        },
      },
      {
        id: "hours_per_day",
        type: "input",
        position: { x: 100, y: 165 },
        data: {
          label: t.expenses.billable.form["billable-hours"],
          suffix: t.expenses.billable.form["billable-hours-period"],
          value: data.hours_per_day,
          onChange: (value: number) => handleNodeChange("hours_per_day", value),
          max: 24,
          min: 1,
          icon: "time",
          error: form.formState.errors.hours_per_day?.message,
          description:
            "Considere que cerca de apenas 75% dos seus dias trabalhados sejam faturáveis.",
        },
      },
      {
        id: "monthly_salary",
        type: "input",
        position: { x: 100, y: 350 },
        data: {
          label: t.expenses.billable.form["monthly-salary"],
          suffix: t.expenses.billable.form["monthly-salary-period"],
          currency: selectedCurrency.symbol + " ",
          value: data.monthly_salary,
          onChange: (value: number) =>
            handleNodeChange("monthly_salary", value),
          min: 0,
          max: 1000000,
          icon: "wallet",
          error: form.formState.errors.monthly_salary?.message,
          description: "Quanto você quer receber por mês?",
        },
      },
      {
        id: "holiday_days",
        type: "input",
        position: { x: 100, y: 500 },
        data: {
          label: t.expenses.billable.form.holidays,
          suffix: t.expenses.billable.form["holidays-period"],
          value: data.holiday_days,
          min: 0,
          max: 365,
          icon: "flag",
          onChange: (value: number) => handleNodeChange("holiday_days", value),
          error: form.formState.errors.holiday_days?.message,
          description: "Calcule aproximadamente os dias de feriados por ano.",
        },
      },
      {
        id: "vacation_days",
        type: "input",
        position: { x: 100, y: 670 },
        data: {
          label: t.expenses.billable.form.vacations,
          suffix: t.expenses.billable.form["vacations-period"],
          value: data.vacation_days,
          min: 0,
          max: 365,
          icon: "holiday",
          onChange: (value: number) => handleNodeChange("vacation_days", value),
          error: form.formState.errors.vacation_days?.message,
          description:
            "Calcule aproximadamente quantos dias de férias vocês tem ao ano.",
        },
      },
      {
        id: "sick_leave",
        type: "input",
        position: { x: 100, y: 830 },
        data: {
          label: t.expenses.billable.form["sick-leave"],
          suffix: t.expenses.billable.form["sick-leave-period"],
          value: data.sick_leave,
          icon: "pill",
          onChange: (value: number) => handleNodeChange("sick_leave", value),
          min: 0,
          max: 365,
          error: form.formState.errors.sick_leave?.message,
          description: "escrever",
        },
      },

      // Calculation nodes group
      {
        id: "time_off",
        type: "calculation",
        position: { x: 500, y: 450 },
        data: {
          label: t.expenses.billable.form["time-off"],
          formula:
            t.expenses.billable.form.holidays +
            " + " +
            t.expenses.billable.form.vacations +
            " + " +
            t.expenses.billable.form["sick-leave"],
          result: metrics.timeOff,
          description: "Resultado de dias ao ano que você não trabalha.",
          sourcePosition: Position.Top,
          targetPosition: Position.Bottom,
        },
      },
      {
        id: "actual_work_days",
        type: "calculation",
        position: { x: 650, y: 180 },
        data: {
          label: t.expenses.billable.form["actual-work-days"],
          formula:
            t.expenses.billable.form["work-days"] +
            " * " +
            "52" +
            " - " +
            t.expenses.billable.form["time-off"],
          result: metrics.actualWorkDays,
          description: "Resultado de dias ao ano que você trabalha.",
        },
      },
      {
        id: "billable_hours",
        type: "calculation",
        position: { x: 1200, y: 100 },

        data: {
          label: t.expenses.billable.form["billable-hours"],
          formula:
            t.expenses.billable.form["actual-work-days"] +
            " * " +
            t.expenses.billable.form["billable-hours"],
          result: metrics.billableHours,
          description: "Quantidade de horas trabalhadas ao ano.",
          sourcePosition: Position.Bottom,
          targetPosition: Position.Left,
        },
      },

      // Right column - Financial inputs
      {
        id: "taxes",
        type: "input",
        position: { x: 1200, y: 350 },
        data: {
          label: t.expenses.billable.form.taxes,
          suffix: "%",
          value: data.taxes,
          onChange: (value: number) =>
            form.setValue("taxes", value, {
              shouldValidate: true,
              shouldDirty: true,
            }),
          error: form.formState.errors.taxes?.message,
          description: "Calcule aproximadamente o percentual de impostos.",
        },
      },
      {
        id: "fees",
        type: "input",
        position: { x: 1200, y: 530 },
        data: {
          label: t.expenses.billable.form.fees,
          suffix: "%",
          value: data.fees,
          onChange: (value: number) =>
            form.setValue("fees", value, {
              shouldValidate: true,
              shouldDirty: true,
            }),
          error: form.formState.errors.fees?.message,
          description: "Calcule caso haja taxas extras.",
        },
      },
      {
        id: "margin",
        type: "input",
        position: { x: 1200, y: 680 },
        data: {
          label: t.expenses.billable.form.margin,
          suffix: "%",
          value: data.margin,
          onChange: (value: number) =>
            form.setValue("margin", value, {
              shouldValidate: true,
              shouldDirty: true,
            }),
          error: form.formState.errors.margin?.message,
          description:
            "Ao calcular sua tarifa ideal, é interessante adicionar um pouco mais além do seu ponto de equilíbrio.",
        },
      },

      // Output node
      {
        id: "hourly_rate",
        type: "output",
        position: { x: 1600, y: 250 },
        data: {
          label: t.expenses.billable.breakeven["hourly-rate"],
          currency: selectedCurrency.symbol,
          value: metrics.hourlyRate,
          description: "Valor ideal para sua hora.",
        },
      },
    ];

    return { metrics, nodes };
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      work_days: 5,
      hours_per_day: 8,
      monthly_salary: 0,
      holiday_days: 0,
      vacation_days: 0,
      sick_leave: 0,
      taxes: 0,
      fees: 0,
      margin: 0,
    },
  });

  const initialEdges: Edge[] = [
    // Time off calculation group
    {
      id: "e1",
      source: "holiday_days",
      target: "time_off",
    },
    { id: "e2", source: "vacation_days", target: "time_off" },
    { id: "e3", source: "sick_leave", target: "time_off" },

    // Actual work days calculation
    { id: "e4", source: "time_off", target: "actual_work_days" },
    { id: "e5", source: "work_days", target: "actual_work_days" },

    // Billable hours calculation
    { id: "e6", source: "actual_work_days", target: "billable_hours" },
    { id: "e7", source: "hours_per_day", target: "billable_hours" },

    // Break-even calculation flow
    { id: "e8", source: "monthly_salary", target: "hourly_rate" },
    { id: "e9", source: "taxes", target: "hourly_rate" },
    { id: "e10", source: "fees", target: "hourly_rate" },
    { id: "e11", source: "margin", target: "hourly_rate" },
    {
      id: "e12",
      source: "billable_hours",
      target: "hourly_rate",
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const shouldUpdate = useRef(false);
  const handleNodeChange = useCallback(
    (field: keyof FormValues, value: number) => {
      if (isNaN(value)) return;

      shouldUpdate.current = true;

      // Update the form
      form.setValue(field, value, {
        shouldValidate: true,
        shouldDirty: true,
      });

      if (form.formState.errors[field]) return;

      // Get current values and update nodes
      const currentValues = form.getValues();
      const updatedValues = {
        ...currentValues,
        [field]: value,
      };

      // Update nodes and hourly cost
      const { metrics, nodes: updatedNodes } =
        calculateNodesAndMetrics(updatedValues);
      setNodes(updatedNodes);
      setHourlyCost(metrics.hourlyRate);
    },
    [form, setNodes, setHourlyCost]
  );

  useDebounce(
    () => {
      if (
        !isLoadingExpenses &&
        form.formState.isDirty &&
        initialExpenses !== null &&
        shouldUpdate.current
      ) {
        const formValues = form.getValues();
        updateBillableExpenses(
          {
            json: {
              userId,
              workDays: formValues.work_days,
              hoursPerDay: formValues.hours_per_day,
              holidaysDays: formValues.holiday_days,
              vacationsDays: formValues.vacation_days,
              sickLeaveDays: formValues.sick_leave,
              monthlySalary: formValues.monthly_salary,
              taxes: formValues.taxes,
              fees: formValues.fees,
              margin: formValues.margin,
            },
          },
          {
            onSuccess: () => {
              shouldUpdate.current = false;
            },
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
    1000,
    [form.formState.isDirty, isLoadingExpenses, userId, initialExpenses]
  );

  // Modify the useEffect to prevent initial update
  useEffect(() => {
    if (initialExpenses) {
      const formattedData = {
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

      shouldUpdate.current = false; // Prevent initial update
      form.reset(formattedData);
      const { metrics, nodes } = calculateNodesAndMetrics(formattedData);
      setNodes(nodes);
      setEdges(initialEdges);
      setHourlyCost(metrics.hourlyRate);
    } else if (initialExpenses === null) {
      createBillableExpenses(
        {
          json: {
            userId: userId,
          },
        },
        {
          onError: () => {
            toast({
              title: t.validation.error["create-failed"],
              variant: "destructive",
            });
          },
        }
      );
    }
  }, [initialExpenses]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  if (isLoadingExpenses) {
    return <div>Loading...</div>;
  }

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        selectNodesOnDrag={false}
        multiSelectionKeyCode={null}
        // defaultEdgeOptions={{ type: "smoothstep" }}
        // snapToGrid={true}
        // snapGrid={[15, 15]}
        // nodesDraggable={false}
        nodesConnectable={false}
      >
        <Background color="black" className="bg-primary rounded-xl" />
        <Controls />
      </ReactFlow>
    </div>
  );
};
