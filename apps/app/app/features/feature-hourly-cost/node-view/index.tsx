import { useEffect, useCallback, useRef, useMemo } from "react";
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
  NodeChange,
  XYPosition,
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
import { ExpenseItem } from "@/app/types";
import { formatCurrency } from "@/utils/format-currency";
import { useNodeViewStore } from '@/app/store/node-view-store';
import { LoadingNodeView } from './loading';

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

export const NodeView = ({ userId, expenses }: NodeViewProps) => {
  const { data: initialExpenses, isLoading: isLoadingExpenses } =
    useGetBillableExpenses({ userId });
  const { mutate: updateBillableExpenses } = useUpdateBillableExpense();
  const { mutate: createBillableExpenses } = useCreateBillableExpense();
  const { toast } = useToast();
  const t = getTranslations();
  const { setHourlyCost, totalMonthlyExpenses } = useHourlyCostStore();
  const { selectedCurrency } = useCurrencyStore();
  const { nodePositions, setNodePositions, updateNodePosition } = useNodeViewStore();

  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      input: InputNode as any,
      calculation: CalculationNode as any,
      output: OutputNode as any,
    }),
    []
  );

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

    const nodes = [
      {
        id: "taxes",
        type: "input",
        position: nodePositions["taxes"] || { x: 480, y: -210 },
        draggable: true,
        data: {
          label: t.expenses.billable.form.taxes,
          suffix: "%",
          value: data.taxes,
          min: 0,
          max: 100,
          onChange: (value: number) => handleNodeChange("taxes", value),
          error: form.formState.errors.taxes?.message,
          description: t.expenses.billable.flow.taxes,
        },
      },
      {
        id: "fees",
        type: "input",
        position: nodePositions["fees"] || { x: 480, y: -15 },
        draggable: true,
        data: {
          label: t.expenses.billable.form.fees,
          suffix: "%",
          value: data.fees,
          min: 0,
          max: 100,
          onChange: (value: number) => handleNodeChange("fees", value),
          error: form.formState.errors.fees?.message,
          description: t.expenses.billable.flow.fees,
        },
      },
      {
        id: "monthly_salary",
        type: "input",
        position: nodePositions["monthly_salary"] || { x: 75, y: 30 },
        draggable: true,
        data: {
          label: t.expenses.billable.form["monthly-salary"],
          suffix: t.expenses.billable.form["monthly-salary-period"],
          currency: selectedCurrency.symbol + " ",
          value: data.monthly_salary,
          onChange: (value: number) => handleNodeChange("monthly_salary", value),
          min: 0,
          max: 1000000,
          icon: "wallet",
          error: form.formState.errors.monthly_salary?.message,
          description: t.expenses.billable.flow["monthly-salary"],
        },
      },
      {
        id: "hours_per_day",
        type: "input",
        position: nodePositions["hours_per_day"] || { x: 75, y: 210 },
        draggable: true,
        data: {
          label: t.expenses.billable.form["billable-hours"],
          suffix: t.expenses.billable.form["billable-hours-period"],
          value: data.hours_per_day,
          onChange: (value: number) => handleNodeChange("hours_per_day", value),
          max: 24,
          min: 1,
          icon: "time",
          error: form.formState.errors.hours_per_day?.message,
          description: t.expenses.billable.flow["billable-hours"],
        },
      },
      {
        id: "work_days",
        type: "input",
        position: nodePositions["work_days"] || { x: 75, y: 390 },
        draggable: true,
        data: {
          label: t.expenses.billable.form["work-days"],
          suffix: t.expenses.billable.form["work-days-period"],
          value: data.work_days,
          onChange: (value: number) => handleNodeChange("work_days", value),
          max: 7,
          min: 1,
          error: form.formState.errors.work_days?.message,
          icon: "calendar",
          sourcePosition: Position.Right,
          targetPosition: Position.Bottom,
          description: t.expenses.billable.flow["work-days"],
        },
      },
      {
        id: "holiday_days",
        type: "input",
        position: nodePositions["holiday_days"] || { x: 75, y: 570 },
        draggable: true,
        data: {
          label: t.expenses.billable.form.holidays,
          suffix: t.expenses.billable.form["holidays-period"],
          value: data.holiday_days,
          min: 0,
          max: 365,
          icon: "flag",
          onChange: (value: number) => handleNodeChange("holiday_days", value),
          error: form.formState.errors.holiday_days?.message,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          description: t.expenses.billable.flow.holidays,
        },
      },
      {
        id: "vacation_days",
        type: "input",
        position: nodePositions["vacation_days"] || { x: 75, y: 750 },
        draggable: true,
        data: {
          label: t.expenses.billable.form.vacations,
          suffix: t.expenses.billable.form["vacations-period"],
          value: data.vacation_days,
          min: 0,
          max: 365,
          icon: "holiday",
          onChange: (value: number) => handleNodeChange("vacation_days", value),
          error: form.formState.errors.vacation_days?.message,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
          description: t.expenses.billable.flow.vacations,
        },
      },
      {
        id: "sick_leave",
        type: "input",
        position: nodePositions["sick_leave"] || { x: 75, y: 915 },
        draggable: true,
        data: {
          label: t.expenses.billable.form["sick-leave"],
          suffix: t.expenses.billable.form["sick-leave-period"],
          value: data.sick_leave,
          icon: "pill",
          onChange: (value: number) => handleNodeChange("sick_leave", value),
          min: 0,
          max: 365,
          error: form.formState.errors.sick_leave?.message,
          description: t.expenses.billable.flow["sick-leave"],
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        },
      },
      {
        id: "total_monthly_expenses",
        type: "calculation",
        position: nodePositions["total_monthly_expenses"] || { x: 1170, y: -210 },
        draggable: true,
        data: {
          label: t.expenses.billable.flow["total-monthly-cost"].title,
          formula: t.expenses.billable.flow["total-monthly-cost"].formula,
          result: formatCurrency(totalMonthlyExpenses, {
            currency: selectedCurrency.code,
          }),
          description: t.expenses.billable.flow["total-monthly-cost"].description,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        },
      },
      {
        id: "total_yearly_cost",
        type: "calculation",
        position: nodePositions["total_yearly_cost"] || { x: 1005, y: 135 },
        draggable: true,
        data: {
          label: t.expenses.billable.flow["total-yearly-cost"].title,
          formula: t.expenses.billable.flow["total-yearly-cost"].formula,
          result: metrics.billableHours,
          description: t.expenses.billable.flow["total-yearly-cost"].description,
          sourcePosition: Position.Right,
          targetPosition: Position.Top,
        },
      },
      {
        id: "actual_work_days",
        type: "calculation",
        position: nodePositions["actual_work_days"] || { x: 480, y: 780 },
        draggable: true,
        data: {
          label: t.expenses.billable.flow["actual-work-days"].title,
          formula: t.expenses.billable.flow["actual-work-days"].formula,
          result: `${metrics.actualWorkDays} ${t.expenses.billable.form["actual-work-days-period"]}`,
          description: t.expenses.billable.flow["actual-work-days"].description,
          sourcePosition: Position.Right,
          targetPosition: Position.Top,
        },
      },
      {
        id: "time_off",
        type: "calculation",
        position: nodePositions["time_off"] || { x: 480, y: 570 },
        draggable: true,
        data: {
          label: t.expenses.billable.flow["time-off"].title,
          formula: t.expenses.billable.flow["time-off"].formula,
          result: `${metrics.timeOff} ${t.expenses.billable.form["time-off-period"]}`,
          description: t.expenses.billable.flow["time-off"].description,
          sourcePosition: Position.Bottom,
          targetPosition: Position.Left,
        },
      },
      {
        id: "billable_hours",
        type: "calculation",
        position: nodePositions["billable_hours"] || { x: 1215, y: 390 },
        draggable: true,
        data: {
          label: t.expenses.billable.flow["total-billable-hours"].title,
          formula: t.expenses.billable.flow["total-billable-hours"].formula,
          result: metrics.billableHours,
          description: t.expenses.billable.flow["total-billable-hours"].description,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        },
      },
      {
        id: "margin",
        type: "input",
        position: nodePositions["margin"] || { x: 1395, y: 630 },
        draggable: true,
        data: {
          label: t.expenses.billable.form.margin,
          suffix: "%",
          value: data.margin,
          min: 0,
          max: 100,
          onChange: (value: number) => handleNodeChange("margin", value),
          error: form.formState.errors.margin?.message,
          description: t.expenses.billable.flow.margin,
        },
      },
      {
        id: "hourly_rate",
        type: "output",
        position: nodePositions["hourly_rate"] || { x: 1920, y: 390 },
        draggable: true,
        data: {
          label: t.expenses.billable.flow["hourly-rate"].title,
          value: formatCurrency(metrics.hourlyRate, {
            currency: selectedCurrency.code,
          }),
          formula: t.expenses.billable.flow["hourly-rate"].formula,
          description: t.expenses.billable.flow["hourly-rate"].description,
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
    // ...expenses.map((expense) => ({
    //   id: `expense_edge_${expense.id}`,
    //   source: `expense_${expense.id}`,
    //   target: "total_monthly_expenses",
    // })),

    {
      id: "monthly_expenses_to_hourly",
      source: "total_monthly_expenses",
      target: "total_yearly_cost",
    },

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
    { id: "e8", source: "monthly_salary", target: "total_yearly_cost" },
    { id: "e9", source: "taxes", target: "total_yearly_cost" },
    { id: "e10", source: "fees", target: "total_yearly_cost" },
    { id: "e11", source: "margin", target: "hourly_rate" },
    { id: "e13", source: "total_yearly_cost", target: "hourly_rate" },
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

      shouldUpdate.current = false;
      form.reset(formattedData);
      const { metrics, nodes } = calculateNodesAndMetrics(formattedData);

      // Save initial positions to store if none exist
      if (Object.keys(nodePositions).length === 0) {
        const initialPositions = nodes.reduce((acc, node) => ({
          ...acc,
          [node.id]: node.position,
        }), {});
        setNodePositions(initialPositions);
      }

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
  }, [initialExpenses, nodePositions, setNodePositions]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Update the handler with proper typing and logic
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(changes);

    changes.forEach((change) => {
      if (
        change.type === 'position' &&
        'position' in change &&
        change.position &&
        change.id
      ) {
        const position = change.position as XYPosition;
        updateNodePosition(change.id, position);
      }
    });
  }, [onNodesChange, updateNodePosition]);

  if (isLoadingExpenses) {
    return <div><LoadingNodeView /></div>;
  }

  return (
    <div className="w-full h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        selectNodesOnDrag={false}
        multiSelectionKeyCode={null}
        defaultEdgeOptions={{ type: "default" }}
        snapToGrid={true}
        snapGrid={[15, 15]}
        nodesDraggable={true}
        nodesConnectable={false}
      >
        <Background color="black" className="bg-primary rounded-xl" />
        <Controls />
      </ReactFlow>
    </div>
  );
};
