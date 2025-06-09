import { defineCommand } from 'citty'
import { availableModels, commonArgs, providers } from '@/config'
import { console } from '@/utils'
import { handleCliError } from '@/utils/general'

export default defineCommand({
  meta: {
    name: 'models',
    description: 'Show available LLM models.',
  },
  args: {
    ...commonArgs,
    providers: {
      type: 'positional',
      description: `The provider(s) to show models for. If omitted, all providers are shown.`,
      required: false,
      valueHint: providers.join(' | '),
    },
  },
  async run({ args }) {
    const providersToShow = args._

    for (const provider of providersToShow) {
      if (!providers.includes(provider as any))
        handleCliError(`Invalid provider "${provider}"`, `Available providers: ${providers.join(', ')}`)
    }

    console.log('`Available Models:`')
    const providersToList = providersToShow.length > 0 ? providersToShow : Object.keys(availableModels)

    for (const provider of providersToList) {
      if (!availableModels[provider as keyof typeof availableModels])
        continue

      console.log(`  \`${provider}\``)
      availableModels[provider as keyof typeof availableModels].forEach((model) => {
        console.log(`    - **${model.alias}**: ${model.value}`)
      })
    }
  },
})
