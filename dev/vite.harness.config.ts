import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';
import { firebaseStubs, reviewPartsContent } from './review/vitePlugin';
import { reviewSkillsContent } from './review/skillsPlugin';

export default defineConfig({
  // Project root so Tailwind scans src/ (the rooms use app utilities).
  root: resolve(__dirname, '..'),
  base: './',
  // The parts review page (dev/parts-review.html) runs the app's real components: Firebase is stubbed and
  // the parts copy is the fixture, every row treated as signed off (dev/review/vitePlugin.ts).
  plugins: [reviewPartsContent(), reviewSkillsContent(), react(), tailwindcss()],
  resolve: { alias: firebaseStubs },
  build: {
    outDir: resolve(__dirname, '../dev-dist'), emptyOutDir: true,
    rollupOptions: {
      input: {
        ftf: resolve(__dirname, 'find-the-feeling.html'), capacity: resolve(__dirname, 'capacity.html'), body: resolve(__dirname, 'body-map.html'),
        parts: resolve(__dirname, 'parts.html'), review: resolve(__dirname, 'parts-review.html'),
        skills: resolve(__dirname, 'skills-review.html'), people: resolve(__dirname, 'people.html'), practice: resolve(__dirname, 'practice.html'),
      },
    },
  },
});
