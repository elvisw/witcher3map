import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        w: 'w.html',
        v: 'v.html',
        g: 'g.html',
        s: 's.html',
        k: 'k.html',
        i: 'i.html',
        t: 't.html',
        f: 'f.html',
      },
    },
    outDir: 'dist',
  },
});