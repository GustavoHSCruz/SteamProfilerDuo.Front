import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // Editors may truncate a file before rewriting it. Wait for the completed
    // write so the dev module cache never captures an empty intermediate file.
    watch: { awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 } },
    proxy: { '/api': { target: process.env.DUO_API_TARGET || 'http://127.0.0.1:16300' } },
  },
});
