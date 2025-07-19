/**
 * Test setup utilities for React Query
 * Configure global test environment for React Query testing
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Global test setup for React Query
 * Call this in your test setup file (e.g., setupTests.ts)
 */
export function setupReactQueryTesting() {
  // Disable React Query dev tools in tests
  if (typeof window !== "undefined") {
    (window as any).__REACT_QUERY_STATE__ = undefined;
  }

  // Mock console methods to reduce noise in tests
  const originalError = console.error;
  const originalWarn = console.warn;

  beforeEach(() => {
    // Reset console mocks before each test
    console.error = jest.fn();
    console.warn = jest.fn();
  });

  afterEach(() => {
    // Restore console methods after each test
    console.error = originalError;
    console.warn = originalWarn;
  });

  // Global cleanup
  afterAll(() => {
    // Clean up any remaining timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });
}

/**
 * Mock timers setup for testing React Query
 * Useful for testing queries with delays, retries, etc.
 */
export function setupMockTimers() {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });
}

/**
 * Mock fetch for testing
 * Provides a basic fetch mock that can be customized per test
 */
export function setupFetchMock() {
  const mockFetch = jest.fn();

  beforeEach(() => {
    global.fetch = mockFetch;
    mockFetch.mockClear();
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  return mockFetch;
}

/**
 * Mock localStorage for testing persistence
 */
export function setupLocalStorageMock() {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    // Clear all mocks
    Object.values(localStorageMock).forEach(mock => mock.mockClear());
  });

  return localStorageMock;
}

/**
 * Mock IndexedDB for testing persistence
 */
export function setupIndexedDBMock() {
  const mockDB = {
    transaction: jest.fn(),
    objectStore: jest.fn(),
    put: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
  };

  const mockRequest = {
    result: mockDB,
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
  };

  beforeEach(() => {
    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: jest.fn().mockReturnValue(mockRequest),
      },
      writable: true,
    });

    // Clear all mocks
    Object.values(mockDB).forEach(mock => mock.mockClear());
  });

  return { mockDB, mockRequest };
}

/**
 * Utility to advance timers and wait for queries
 */
export async function advanceTimersAndWait(ms: number = 0) {
  if (ms > 0) {
    jest.advanceTimersByTime(ms);
  }

  // Wait for any pending promises
  await new Promise(resolve => setImmediate(resolve));
}

/**
 * Test environment detection
 */
export const isTestEnvironment = () => {
  return process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
};

/**
 * Mock network conditions for testing
 */
export function mockNetworkConditions() {
  const originalOnLine = navigator.onLine;

  const setOnline = (online: boolean) => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: online,
    });
  };

  const triggerOffline = () => {
    setOnline(false);
    window.dispatchEvent(new Event('offline'));
  };

  const triggerOnline = () => {
    setOnline(true);
    window.dispatchEvent(new Event('online'));
  };

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: originalOnLine,
    });
  });

  return {
    setOnline,
    triggerOffline,
    triggerOnline,
  };
}