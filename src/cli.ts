import { defineCommand, runMain, showUsage } from 'citty'
import { description, version } from '../package.json'
import { commands } from './commands'
import { commonArgs, models, resolveConfig } from './config'
import { console, ICONS } from './utils'
import 'dotenv/config'

const main = defineCommand({
  meta: {
    name: 'lin',
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
      console.log(`\`Models:\`\n${models.join('\n')}`)

    if (rawArgs.length === 0)
      showUsage(cmd)

    const { config } = await resolveConfig(args)
    if (args.debug) {
      console.log(ICONS.info, 'Config:')
      console.log(config)
    }
  },
})

runMain(main)
