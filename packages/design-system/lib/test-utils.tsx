/**
 * Test utilities for React Query
 * Provides wrappers and utilities for testing components and hooks that use React Query
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { type ReactElement, type ReactNode } from "react";

/**
 * Creates a new QueryClient for testing
 * Configured with settings optimized for testing
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests
        retry: false,
        // Disable caching in tests
        gcTime: 0,
        staleTime: 0,
        // Disable background refetching
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      mutations: {
        // Disable retries in tests
        retry: false,
      },
    },
    // Disable logging in tests
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

/**
 * Test wrapper component that provides QueryClient context
 */
interface TestWrapperProps {
  children: ReactNode;
  queryClient?: QueryClient;
}

export function TestWrapper({ children, queryClient }: TestWrapperProps) {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Custom render function that includes QueryClient provider
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient;
  wrapper?: React.ComponentType<{ children: ReactNode }>;
}

export function renderWithQueryClient(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const { queryClient, wrapper: Wrapper, ...renderOptions } = options;

  const AllTheProviders = ({ children }: { children: ReactNode }) => {
    const content = (
      <TestWrapper queryClient={queryClient}>
        {children}
      </TestWrapper>
    );

    return Wrapper ? <Wrapper>{content}</Wrapper> : content;
  };

  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

/**
 * Utility to create a wrapper for renderHook from @testing-library/react-hooks
 */
export function createQueryWrapper(queryClient?: QueryClient) {
  const client = queryClient || createTestQueryClient();

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Mock data generators for testing
 */
export const mockData = {
  fixedExpense: (overrides = {}) => ({
    id: "1",
    userId: "user-1",
    name: "Test Expense",
    category: "office",
    amount: 100,
    period: "monthly" as const,
    rank: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  billableExpense: (overrides = {}) => ({
    id: "1",
    userId: "user-1",
    fees: 1000,
    workDays: 22,
    hoursPerDay: 8,
    holidaysDays: 10,
    vacationsDays: 20,
    sickDays: 5,
    billableHours: 1760,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  equipmentExpense: (overrides = {}) => ({
    id: "1",
    userId: "user-1",
    name: "Test Equipment",
    category: "computer",
    amount: 2000,
    purchaseDate: new Date(),
    usage: 80,
    lifeSpan: 36,
    rank: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  }),
};

/**
 * Utility to wait for queries to settle in tests
 */
export async function waitForQueriesToSettle(queryClient: QueryClient) {
  await queryClient.getQueryCache().findAll().forEach(query => {
    return query.fetch();
  });
}

/**
 * Utility to clear all queries in tests
 */
export function clearAllQueries(queryClient: QueryClient) {
  queryClient.clear();
}

/**
 * Mock server response utilities
 */
export const mockResponses = {
  success: (data: any) => ({
    ok: true,
    status: 200,
    json: async () => ({ success: true, data }),
    headers: new Headers({ 'content-type': 'application/json' }),
  }),

  error: (status = 500, message = "Internal Server Error") => ({
    ok: false,
    status,
    json: async () => ({ success: false, error: message }),
    headers: new Headers({ 'content-type': 'application/json' }),
  }),

  created: (data: any) => ({
    ok: true,
    status: 201,
    json: async () => ({ success: true, data }),
    headers: new Headers({ 'content-type': 'application/json' }),
  }),
};

/**
 * Utility to mock the RPC client for testing
 */
export function createMockRPCClient() {
  return {
    api: {
      expenses: {
        "fixed-costs": {
          $get: jest.fn(),
          $post: jest.fn(),
          $put: jest.fn(),
          ":id": {
            $patch: jest.fn(),
          },
          ":userId": {
            ":id": {
              $delete: jest.fn(),
            },
          },
        },
        "billable-costs": {
          $get: jest.fn(),
          $post: jest.fn(),
          $patch: jest.fn(),
        },
        "equipment-costs": {
          $get: jest.fn(),
          $post: jest.fn(),
          $patch: jest.fn(),
        },
      },
    },
  };
}

/**
 * Test assertion helpers
 */
export const testHelpers = {
  expectQueryToBeLoading: (result: any) => {
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeNull();
  },

  expectQueryToBeSuccess: (result: any, data?: any) => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
    if (data !== undefined) {
      expect(result.current.data).toEqual(data);
    }
  },

  expectQueryToBeError: (result: any, error?: any) => {
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();
    if (error !== undefined) {
      expect(result.current.error).toEqual(error);
    }
  },

  expectMutationToBeIdle: (result: any) => {
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  },

  expectMutationToBeLoading: (result: any) => {
    expect(result.current.isPending).toBe(true);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(false);
  },

  expectMutationToBeSuccess: (result: any, data?: any) => {
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.isError).toBe(false);
    if (data !== undefined) {
      expect(result.current.data).toEqual(data);
    }
  },

  expectMutationToBeError: (result: any, error?: any) => {
    expect(result.current.isPending).toBe(false);
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.isError).toBe(true);
    if (error !== undefined) {
      expect(result.current.error).toEqual(error);
    }
  },
};