import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        overlay: resolve(__dirname, 'src/renderer/overlay/index.html'),
        settings: resolve(__dirname, 'src/renderer/settings/index.html'),
      },
    },
  },
});
