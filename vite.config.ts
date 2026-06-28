import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/schema/',
  plugins: [react()],
  server: {
    proxy: {
      '/schema/api': 'http://localhost:8787'
    }
  }
});
