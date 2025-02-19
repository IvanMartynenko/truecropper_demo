import { defineConfig } from 'vite';

export default defineConfig({
  base: '/truecropper_demo/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      }
    }
  }
});