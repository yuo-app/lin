import { defineCommand } from 'citty'
import c from 'picocolors'
import { availableModels, commonArgs, providers } from '@/config'
import { console, generateScoreDots } from '@/utils/console'
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

    let maxLength = 0
    for (const provider of providersToList) {
      if (availableModels[provider as keyof typeof availableModels]) {
        availableModels[provider as keyof typeof availableModels].forEach((model) => {
          const modelInfoLength = `    - ${model.alias}: ${model.value}`.length
          if (modelInfoLength > maxLength)
            maxLength = modelInfoLength
        })
      }
    }

    for (const provider of providersToList) {
      if (!availableModels[provider as keyof typeof availableModels])
        continue

      console.log(`  \`${provider}\``)
      availableModels[provider as keyof typeof availableModels].forEach((model) => {
        const iqDots = generateScoreDots(model.iq, c.magenta)
        const speedDots = generateScoreDots(model.speed, c.cyan)

        const attributesString = [iqDots, speedDots].filter(Boolean).join('  ')
        const modelInfo = `    - **${model.alias}**: ${model.value}`
        const modelInfoLength = `    - ${model.alias}: ${model.value}`.length
        const padding = ' '.repeat(maxLength - modelInfoLength)

        console.log(`${modelInfo}${padding}  ${attributesString}`)
      })
    }
  },
})
