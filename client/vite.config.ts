import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [
      react(), 
      tailwindcss(),
      viteStaticCopy({
        targets: [
          {
            src: 'node_modules/@mlightcad/data-model/dist/dxf-parser-worker.js',
            dest: 'assets'
          },
          {
            src: 'node_modules/@mlightcad/cad-simple-viewer/dist/*-worker.js',
            dest: 'assets'
          }
        ]
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : []
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'worker_threads': path.resolve(__dirname, 'src/lib/empty.ts'),
      },
      dedupe: ['three']
    }
  };
});
