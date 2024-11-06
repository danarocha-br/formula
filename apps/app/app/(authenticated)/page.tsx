import { database } from "@repo/database";
import { ExpenseItem } from '@/types';

import type { Metadata } from "next";
import type { ReactElement } from "react";
import { FeatureHourlyCost } from './features/feature-hourly-cost';

const title = "Formula by Compasso";
const description = "Manage your expenses";

export const metadata: Metadata = {
  title,
  description,
};

  const expenses: ExpenseItem[] = [
    {
      id: "1",
      label: "Energy",
      value: 400,
      category: "energy",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "2",
      label: "Rental",
      value: 50,
      category: "rental",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "3",
      label: "Internet",
      value: 700,
      category: "internet",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "4",
      label: "Energy",
      value: 80,
      category: "energy",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "5",
      label: "Internet",
      value: 80,
      category: "internet",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "6",
      label: "Car",
      value: 400,
      category: "transport",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "7",
      label: "Internet",
      value: 230,
      category: "internet",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "8",
      label: "Internet",
      value: 40,
      category: "internet",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "9",
      label: "Internet",
      value: 40,
      category: "internet",
      period: "month",
      createdAt: new Date(),
    },
    {
      id: "10",
      label: "Internet",
      value: 40,
      category: "internet",
      period: "month",
      createdAt: new Date(),
    },
  ];

const App = async (): Promise<ReactElement> => {
  return (
    <main className='pt-2'>
      <FeatureHourlyCost expenses={[]} />
    </main>
  );
};

export default App;
