import { defineConfig } from 'vite';

// No framework, no backend, no external services — a plain static build.
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: true,
  },
});
