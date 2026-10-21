import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages(…/office-box/web/)에서 상대 경로로 열리도록 base './'
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../web',
    emptyOutDir: true,
    rollupOptions: { output: { manualChunks: { xlsx: ['xlsx'], react: ['react', 'react-dom'] } } },
  },
});
