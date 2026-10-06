import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
export default defineConfig({
  // Project root so Tailwind scans src/ (the rooms use app utilities).
  root: resolve(__dirname, '..'),
  base: './',
  plugins: [react(), tailwindcss()],
  build: { outDir: resolve(__dirname, '../dev-dist'), emptyOutDir: true, rollupOptions: { input: { ftf: resolve(__dirname, 'find-the-feeling.html'), capacity: resolve(__dirname, 'capacity.html'), body: resolve(__dirname, 'body-map.html'), parts: resolve(__dirname, 'parts.html') } } },
});
