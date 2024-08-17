import { defineCommand, runMain } from 'citty'
import { consola } from 'consola'
import { description, name, version } from '../package.json'
import { commands } from './commands'

const main = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  args: {
    version: {
      alias: 'v',
      type: 'boolean',
    },
  },
  subCommands: commands,
  run({ args }) {
    if (args.version)
      consola.log(`${name} \`v${version}\``)
  },
})

runMain(main)
