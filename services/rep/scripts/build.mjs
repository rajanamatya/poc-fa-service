import { build } from 'esbuild'

await build({
  entryPoints: ['src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  outfile: 'dist/handler.js',
  external: ['@aws-sdk/*'],
  sourcemap: true,
  minify: false,
})
