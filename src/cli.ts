import { defineCommand, runMain, showUsage } from 'citty'
import { description, name, version } from '../package.json'
import { commands } from './commands'
import { commonArgs, models, resolveConfig } from './config'
import { console } from './utils/'
import 'dotenv/config'

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
    models: {
      type: 'boolean',
      description: 'show models',
    },
    ...commonArgs,
  },
  subCommands: commands,
  async run({ args, cmd, rawArgs }) {
    if (args.version)
      console.log(`${name} \`v${version}\``)

    if (args.models)
      console.log(JSON.stringify(models, null, 2))

    if (rawArgs.length === 0)
      showUsage(cmd)

    const { config } = await resolveConfig(args)
    if (args.debug)
      console.log(config)
  },
})

runMain(main)
