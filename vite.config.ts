import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    port: 8080,
    open: true,
    headers: {
      // Required for ONNX Runtime Web WASM multithreading
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    target: 'es2022',
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'onnxruntime', test: /node_modules[\\/]onnxruntime-web/ },
            { name: 'paddle-ocr', test: /node_modules[\\/]ppu-paddle-ocr/ },
          ],
        },
      },
    },
  },
  oxc: {
    target: 'es2022',
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
    rolldownOptions: {
      transform: { target: 'es2022' },
    },
  },
});
