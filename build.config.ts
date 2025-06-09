import path from 'node:path'
import { defineBuildConfig } from 'unbuild'
import { dependencies } from './package.json'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/cli',
  ],
  clean: true,
  declaration: true,
  rollup: {
    esbuild: {
      minify: true,
    },
    alias: {
      entries: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
      ],
    },
  },
  externals: Object.keys(dependencies),
})
