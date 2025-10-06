interface BreakEvenInput {
  billableHours: number;
  monthlySalary: number;
  taxRate: number;
  fees: number;
  margin: number;
  totalExpensesCostPerMonth: number;
  hoursPerDay: number;
  workDays: number;
}

interface BreakEvenCalculations {
  breakEven: number;
  hourlyRate: number;
  dayRate: number;
  weekRate: number;
  monthlyRate: number;
}

const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

export const useBreakEvenCalculator = (
  input: BreakEvenInput
): BreakEvenCalculations => {
  const {
    billableHours,
    monthlySalary,
    taxRate,
    fees,
    margin,
    totalExpensesCostPerMonth,
    hoursPerDay,
    workDays,
  } = input;

  const safeBillableHours = Math.max(billableHours, 0);

  if (safeBillableHours === 0) {
    return {
      breakEven: 0,
      hourlyRate: 0,
      dayRate: 0,
      weekRate: 0,
      monthlyRate: 0,
    };
  }

  const yearlySalary = Math.max(monthlySalary, 0) * 12;
  const totalYearlyExpenses = Math.max(totalExpensesCostPerMonth, 0) * 12;
  const baseYearlyCosts = yearlySalary + totalYearlyExpenses;

  const marginMultiplier = 1 + Math.max(margin, 0) / 100;
  const costsWithMargin = baseYearlyCosts * marginMultiplier;

  const deductionRate = Math.min(Math.max(taxRate + fees, 0) / 100, 0.99);
  const netRevenueFactor = 1 - deductionRate;

  const grossYearlyRevenue = costsWithMargin / netRevenueFactor;
  const hourlyRate = grossYearlyRevenue / safeBillableHours;
  const dayRate = hourlyRate * hoursPerDay;
  const weekRate = dayRate * workDays;
  const monthlyRate = grossYearlyRevenue / 12;

  return {
    breakEven: roundToTwoDecimals(grossYearlyRevenue),
    hourlyRate: roundToTwoDecimals(hourlyRate),
    dayRate: roundToTwoDecimals(dayRate),
    weekRate: roundToTwoDecimals(weekRate),
    monthlyRate: roundToTwoDecimals(monthlyRate),
  };
};
