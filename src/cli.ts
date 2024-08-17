import { defineCommand, runMain } from 'citty'
import { description, name, version } from '../package.json'
import { console } from './utils'
import { commands } from './commands'
import { commonArgs } from './config'

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
      description: 'show version',
    },
    ...commonArgs,
  },
  subCommands: commands,
  run({ args }) {
    if (args.version)
      console.log(`${name} \`v${version}\``)
  },
})

runMain(main)
