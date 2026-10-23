import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor')) {
            return 'monaco';
          }
          if (id.includes('prettier')) {
            return 'prettier';
          }
          if (id.includes('lucide-vue-next') || id.includes('node_modules/vue')) {
            return 'vendor';
          }
        },
      },
    },
  },
});

