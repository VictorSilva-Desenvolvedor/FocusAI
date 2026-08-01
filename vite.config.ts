import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    watch: {
      /*
       * Material de apoio não é fonte e não deve derrubar o dev server.
       * Um PDF aberto num leitor fica travado no Windows e o watcher morre com
       * EBUSY, levando o processo inteiro junto.
       */
      ignored: ['**/docs/**', '**/.screenshots/**', '**/*.pdf', '**/*.xlsx', '**/*.docx'],
    },
  },
});
