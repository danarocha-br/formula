import { useMemo } from "react";

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

  const yearlySalary = monthlySalary * 12;
  const totalYearlyExpenses = totalExpensesCostPerMonth * 12;
  const totalExpenses = yearlySalary + totalYearlyExpenses;

  const totalYearlyTaxes = calculateTaxes(totalExpenses, taxRate);
  const totalYearlyCosts =
    yearlySalary + totalYearlyTaxes + totalYearlyExpenses;

  const baseHourlyRate = totalYearlyCosts / billableHours;
  const marginMultiplier = 1 + margin / 100;
  const hourlyRate = baseHourlyRate * marginMultiplier;
  const dayRate = hourlyRate * hoursPerDay;
  const weekRate = dayRate * workDays;
  const monthlyRate = (hourlyRate * billableHours) / 12;

  return {
    breakEven: roundToTwoDecimals(totalYearlyCosts),
    hourlyRate: roundToTwoDecimals(hourlyRate),
    dayRate: roundToTwoDecimals(dayRate),
    weekRate: roundToTwoDecimals(weekRate),
    monthlyRate: roundToTwoDecimals(monthlyRate),
  };
};
