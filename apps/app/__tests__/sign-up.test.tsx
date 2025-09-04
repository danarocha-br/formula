import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import Page from '../app/(unauthenticated)/sign-up/[[...sign-up]]/page';

// Mock Clerk components since they require ClerkProvider
vi.mock('@clerk/nextjs', () => ({
  SignUp: () => <div><h1>Create an account</h1></div>,
}));

test('Sign Up Page', () => {
  render(<Page />);
  expect(
    screen.getByRole('heading', {
      level: 1,
      name: 'Create an account',
    })
  ).toBeDefined();
});
