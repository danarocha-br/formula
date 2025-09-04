"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { BillableCostExpensesRepository } from "@repo/database";
import { RedisCacheRepository } from "@repo/database/repositories/redis-cache-repository";
import { BillableCostCacheKeys } from "@repo/database/cache-keys/billable-cost-cache-keys";
import { database } from "@repo/database";
import { redirect } from "next/navigation";
import { cache } from "react";

/**
 * Calculate default billable hours based on work parameters
 */
function calculateDefaultBillableHours() {
  const defaultWorkDays = 5;
  const defaultHoursPerDay = 6;
  const defaultHolidaysDays = 12;
  const defaultVacationsDays = 30;
  const defaultSickLeaveDays = 3;
  
  const timeOff = defaultHolidaysDays + defaultVacationsDays + defaultSickLeaveDays;
  const workDaysPerYear = defaultWorkDays * 52;
  const actualWorkDays = workDaysPerYear - timeOff;
  
  return actualWorkDays * defaultHoursPerDay; // 1,530 hours/year
}

/**
 * Initialize billable cost configuration for a new user
 * This should be called during onboarding or when user first accesses the app
 */
export async function initializeUserBillableCosts() {
  const { userId } = await auth();
  
  console.log('Initializing user billable costs for userId:', userId);
  
  if (!userId) {
    console.log('No userId found, redirecting to sign-in');
    redirect("/sign-in");
  }
  
  try {
    console.log('Creating repository instances...');
    const repository = new BillableCostExpensesRepository();
    const cacheRepository = new RedisCacheRepository();
    
    console.log('Checking if user already has billable costs...');
    // Check if already exists
    const existingExpense = await repository.findByUserId(userId);
    if (existingExpense) {
      console.log('User already has billable costs, returning existing data');
      return { success: true, data: existingExpense, created: false };
    }
    
    console.log('Ensuring user exists in database...');
    // Get the current user from Clerk to get profile info
    const clerkUser = await currentUser();
    
    // Ensure user exists in database (upsert)
    await database.user.upsert({
      where: { id: userId },
      update: {
        // Update email/name if they changed in Clerk
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        name: clerkUser?.fullName || `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || null,
        avatar: clerkUser?.imageUrl,
      },
      create: {
        id: userId,
        email: clerkUser?.emailAddresses?.[0]?.emailAddress,
        name: clerkUser?.fullName || `${clerkUser?.firstName || ''} ${clerkUser?.lastName || ''}`.trim() || null,
        avatar: clerkUser?.imageUrl,
        plan: 'free', // Default plan
      },
    });
    console.log('User record ensured in database');
    
    console.log('User needs new billable costs, calculating defaults...');
    // Calculate default values
    const defaultBillableHours = calculateDefaultBillableHours();
    console.log('Calculated default billable hours:', defaultBillableHours);
    
    console.log('Creating new billable cost record...');
    // Create the billable cost record
    const billableCostExpense = await repository.create({
      userId,
      workDays: 5,
      holidaysDays: 12,
      vacationsDays: 30,
      sickLeaveDays: 3,
      billableHours: defaultBillableHours,
      hoursPerDay: 6,
      monthlySalary: 0,
      taxes: 0,
      fees: 0,
      margin: 0,
    });
    console.log('Created billable cost record:', billableCostExpense);
    
    console.log('Caching the result...');
    // Cache the result
    await cacheRepository.set(
      BillableCostCacheKeys.billableCost(userId),
      JSON.stringify(billableCostExpense)
    );
    console.log('Successfully cached result');
    
    return { success: true, data: billableCostExpense, created: true };
    
  } catch (error) {
    console.error("Failed to initialize user billable costs:", error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to initialize user data",
      created: false 
    };
  }
}

/**
 * Cached version of getting or creating user billable costs
 * Use this in server components for better performance
 */
export const getOrCreateUserBillableCosts = cache(async () => {
  return initializeUserBillableCosts();
});

/**
 * Check if user has completed onboarding (has billable costs configured)
 */
export async function hasUserCompletedOnboarding() {
  const { userId } = await auth();
  
  if (!userId) {
    return false;
  }
  
  const repository = new BillableCostExpensesRepository();
  const billableCosts = await repository.findByUserId(userId);
  
  return !!billableCosts;
}
