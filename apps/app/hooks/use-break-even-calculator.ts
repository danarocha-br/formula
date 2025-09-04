

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

const calculateTaxes = (totalExpenses: number, taxRate: number): number => {
  return (totalExpenses * taxRate) / 100;
};

const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100;
};

const safeNumber = (value: number): number => {
  if (Number.isNaN(value) || !Number.isFinite(value)) {
    return 0;
  }
  return value;
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

  const yearlySalary = safeNumber(monthlySalary) * 12;
  const totalYearlyExpenses = safeNumber(totalExpensesCostPerMonth) * 12;
  const totalExpenses = yearlySalary + totalYearlyExpenses;

  const totalYearlyTaxes = calculateTaxes(totalExpenses, safeNumber(taxRate));
  const totalYearlyCosts =
    yearlySalary + totalYearlyTaxes + totalYearlyExpenses;

  // Prevent division by zero - if billableHours is 0 or invalid, return 0 for all rates
  const safeBillableHours = safeNumber(billableHours);
  if (safeBillableHours <= 0) {
    return {
      breakEven: roundToTwoDecimals(totalYearlyCosts),
      hourlyRate: 0,
      dayRate: 0,
      weekRate: 0,
      monthlyRate: 0,
    };
  }

  const baseHourlyRate = totalYearlyCosts / safeBillableHours;
  const marginMultiplier = 1 + safeNumber(margin) / 100;
  const hourlyRate = safeNumber(baseHourlyRate * marginMultiplier);
  const dayRate = safeNumber(hourlyRate * safeNumber(hoursPerDay));
  const weekRate = safeNumber(dayRate * safeNumber(workDays));
  const monthlyRate = safeNumber((hourlyRate * safeBillableHours) / 12);

  return {
    breakEven: roundToTwoDecimals(safeNumber(totalYearlyCosts)),
    hourlyRate: roundToTwoDecimals(hourlyRate),
    dayRate: roundToTwoDecimals(dayRate),
    weekRate: roundToTwoDecimals(weekRate),
    monthlyRate: roundToTwoDecimals(monthlyRate),
  };
};
