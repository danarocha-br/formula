import { database } from '@repo/database';
import { NextResponse } from 'next/server';

export const POST = async () => {
  const pages = await database.expensesFixedCost.count();

  return NextResponse.json({ pages });
};
