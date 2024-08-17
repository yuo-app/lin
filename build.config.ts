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
  },
  externals: Object.keys(dependencies),
})
