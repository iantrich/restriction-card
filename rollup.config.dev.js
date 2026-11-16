import resolve from '@rollup/plugin-node-resolve';
import esbuild from 'rollup-plugin-esbuild';
import serve from 'rollup-plugin-serve';
import json from '@rollup/plugin-json';

const onwarn = (warning, warn) => {
  if (warning.code === 'THIS_IS_UNDEFINED' && warning.id?.includes('/node_modules/')) {
    return;
  }

  warn(warning);
};

export default {
  input: 'src/restriction-card.ts',
  output: {
    file: './dist/restriction-card.js',
    format: 'es',
    inlineDynamicImports: true,
  },
  plugins: [
    resolve(),
    esbuild({ target: 'es2022' }),
    json(),
    serve({
      contentBase: './dist',
      host: '0.0.0.0',
      // 5000 is taken by AirPlay Receiver on macOS; override with DEV_PORT if needed
      port: Number(process.env.DEV_PORT) || 5050,
      headers: {
        'Access-Control-Allow-Origin': '*',
        // Lets an HTTPS Home Assistant page (e.g. Nabu Casa) load the card from localhost
        'Access-Control-Allow-Private-Network': 'true',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }),
  ],
  watch: {
    include: 'src/**',
    exclude: 'node_modules/**',
    buildDelay: 500,
    chokidar: {
      usePolling: true,  // Required for reliable file detection on Docker volume mounts
      interval: 1000,
    },
  },
  onwarn,
};
