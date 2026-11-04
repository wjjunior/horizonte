import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['{data,clock,scene,ui,demo,scripts,docs}/**/*.test.ts'],
  },
});
