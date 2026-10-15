import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 4321, strictPort: true },
  build: { target: 'es2022' },
});
