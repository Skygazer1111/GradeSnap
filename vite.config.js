import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 8080,
    open: true,
  },
  build: {
    // esbuild 0.28+ no longer downlevels destructuring for legacy targets.
    // This app relies on modern APIs (Workers, Canvas, Tesseract.js).
    target: 'es2022',
  },
});
