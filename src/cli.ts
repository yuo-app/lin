import { defineCommand, runMain, showUsage } from 'citty'
import { commands } from '@/commands'
import { availableModels, commonArgs, resolveConfig } from '@/config'
import { console, ICONS } from '@/utils'
import { description, version } from '../package.json'
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
      alias: 'M',
      type: 'boolean',
      description: 'show models',
    },
    ...commonArgs,
  },
  subCommands: commands,
  async run({ args, cmd, rawArgs }) {
    if (args.version)
      console.log(`lin \`v${version}\``)

    if (args.models) {
      console.log('`Available Models:`')
      for (const provider in availableModels) {
        console.log(`  \`${provider}\``)
        availableModels[provider as keyof typeof availableModels].forEach((model) => {
          console.log(`    - **${model.alias}**: ${model.value}`)
        })
      }
    }

    if (rawArgs.length === 0 && !args.version && !args.models)
      showUsage(cmd)

    const { config } = await resolveConfig(args)
    if (args.debug) {
      console.log(ICONS.info, 'Config:')
      console.log(config)
    }
  },
})

runMain(main)
