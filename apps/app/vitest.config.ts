import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test-setup.ts'],
    css: {
      modules: {
        classNameStrategy: 'non-scoped'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  css: {
    postcss: null, // Disable PostCSS processing
  },
});
