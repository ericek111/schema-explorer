import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const rawBasePath = process.env.SCHEMA_BASE_PATH || process.env.BASE_PATH || '/schema';
if (!rawBasePath.startsWith('/')) {
  throw new Error(`SCHEMA_BASE_PATH must start with "/": ${rawBasePath}`);
}
const basePath = rawBasePath === '/' ? '/' : `${rawBasePath.replace(/\/+$/, '')}/`;

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    proxy: {
      [`${basePath.replace(/\/$/, '')}/api`]: 'http://localhost:8787'
    }
  }
});
