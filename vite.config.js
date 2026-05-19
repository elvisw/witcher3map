import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  root: '.',
  publicDir: 'public',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        w: resolve(__dirname, 'w.html'),
        v: resolve(__dirname, 'v.html'),
        g: resolve(__dirname, 'g.html'),
        s: resolve(__dirname, 's.html'),
        k: resolve(__dirname, 'k.html'),
        i: resolve(__dirname, 'i.html'),
        t: resolve(__dirname, 't.html'),
        f: resolve(__dirname, 'f.html'),
      },
    },
    outDir: 'dist',
  },
};
