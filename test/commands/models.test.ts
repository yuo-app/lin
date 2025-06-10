import type { MockedFunction } from 'vitest'
import c from 'picocolors'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import modelsCommand from '@/commands/models'
import { availableModels, type ModelDefinition, providers } from '@/config'
import * as consoleModule from '@/utils/console'
import { generateScoreDots } from '@/utils/console'
import * as generalUtils from '@/utils/general'

vi.mock('@/utils/console', async () => {
  const actual = await vi.importActual('@/utils/console')
  return {
    ...actual,
    console: {
      log: vi.fn(),
    },
  }
})

vi.mock('@/utils/general')

describe('models command', () => {
  let mockConsoleLog: MockedFunction<any>
  let mockHandleCliError: MockedFunction<typeof generalUtils.handleCliError>

  beforeEach(() => {
    vi.clearAllMocks()
    mockConsoleLog = consoleModule.console.log as MockedFunction<typeof consoleModule.console.log>
    mockHandleCliError = generalUtils.handleCliError as MockedFunction<typeof generalUtils.handleCliError>
    mockHandleCliError.mockImplementation((message, details) => {
      throw new Error(`${message} ${details ? JSON.stringify(details) : ''}`.trim())
    })
  })

  const baseArgsToRun = {
    _: [],
  }

  it('should show all models when no provider is specified', async () => {
    await modelsCommand.run?.({
      args: { ...baseArgsToRun, providers: undefined } as any,
      rawArgs: [],
      cmd: modelsCommand.meta as any,
    })

    expect(mockConsoleLog).toHaveBeenCalledWith('`Available Models:`')

    const allModels: ModelDefinition[] = Object.values(availableModels).flat()
    let maxLength = 0
    for (const model of allModels) {
      const len = `    - ${model.alias}: ${model.value}`.length
      if (len > maxLength)
        maxLength = len
    }

    for (const provider of Object.keys(availableModels)) {
      expect(mockConsoleLog).toHaveBeenCalledWith(`  \`${provider}\``)
      const models = availableModels[provider as keyof typeof availableModels]
      for (const model of models) {
        const iqDots = generateScoreDots(model.iq, c.magenta)
        const speedDots = generateScoreDots(model.speed, c.cyan)
        const attributes = [iqDots, speedDots].filter(Boolean).join('  ')

        const modelInfo = `    - **${model.alias}**: ${model.value}`
        const plainModelInfoLength = `    - ${model.alias}: ${model.value}`.length
        const padding = ' '.repeat(maxLength - plainModelInfoLength)

        expect(mockConsoleLog).toHaveBeenCalledWith(`${modelInfo}${padding}  ${attributes}`)
      }
    }
  })

  it('should show models for a single specified provider', async () => {
    const provider = 'openai'
    await modelsCommand.run?.({
      args: { ...baseArgsToRun, _: [provider], providers: provider } as any,
      rawArgs: [provider],
      cmd: modelsCommand.meta as any,
    })

    expect(mockConsoleLog).toHaveBeenCalledWith('`Available Models:`')
    expect(mockConsoleLog).toHaveBeenCalledWith(`  \`${provider}\``)

    const models = availableModels[provider]
    let maxLength = 0
    for (const model of models) {
      const len = `    - ${model.alias}: ${model.value}`.length
      if (len > maxLength)
        maxLength = len
    }

    for (const model of models) {
      const iqDots = generateScoreDots(model.iq, c.magenta)
      const speedDots = generateScoreDots(model.speed, c.cyan)
      const attributes = [iqDots, speedDots].filter(Boolean).join('  ')

      const modelInfo = `    - **${model.alias}**: ${model.value}`
      const plainModelInfoLength = `    - ${model.alias}: ${model.value}`.length
      const padding = ' '.repeat(maxLength - plainModelInfoLength)

      expect(mockConsoleLog).toHaveBeenCalledWith(`${modelInfo}${padding}  ${attributes}`)
    }
  })

  it('should show models for multiple specified providers', async () => {
    const providersToShow = ['openai', 'google']
    await modelsCommand.run?.({
      args: { ...baseArgsToRun, _: providersToShow, providers: providersToShow[0] } as any,
      rawArgs: providersToShow,
      cmd: modelsCommand.meta as any,
    })

    expect(mockConsoleLog).toHaveBeenCalledWith('`Available Models:`')

    const modelsToList: ModelDefinition[] = providersToShow.flatMap(p => [...availableModels[p as keyof typeof availableModels]])
    let maxLength = 0
    for (const model of modelsToList) {
      const len = `    - ${model.alias}: ${model.value}`.length
      if (len > maxLength)
        maxLength = len
    }

    for (const provider of providersToShow) {
      expect(mockConsoleLog).toHaveBeenCalledWith(`  \`${provider}\``)
      const models = availableModels[provider as keyof typeof availableModels]
      for (const model of models) {
        const iqDots = generateScoreDots(model.iq, c.magenta)
        const speedDots = generateScoreDots(model.speed, c.cyan)
        const attributes = [iqDots, speedDots].filter(Boolean).join('  ')

        const modelInfo = `    - **${model.alias}**: ${model.value}`
        const plainModelInfoLength = `    - ${model.alias}: ${model.value}`.length
        const padding = ' '.repeat(maxLength - plainModelInfoLength)

        expect(mockConsoleLog).toHaveBeenCalledWith(`${modelInfo}${padding}  ${attributes}`)
      }
    }
  })

  it('should call handleCliError for an invalid provider', async () => {
    const invalidProvider = 'invalid-provider'
    const argsToRun = {
      _: [invalidProvider],
      providers: invalidProvider,
    }

    await expect(modelsCommand.run?.({
      args: argsToRun as any,
      rawArgs: [invalidProvider],
      cmd: modelsCommand.meta as any,
    })).rejects.toThrow()

    expect(mockHandleCliError).toHaveBeenCalledWith(
      `Invalid provider "${invalidProvider}"`,
      `Available providers: ${providers.join(', ')}`,
    )
  })

  it('should call handleCliError for one invalid provider among valid ones', async () => {
    const providersToShow = ['openai', 'invalid-provider']
    const argsToRun = {
      _: providersToShow,
      providers: providersToShow[0],
    }

    await expect(modelsCommand.run?.({
      args: argsToRun as any,
      rawArgs: providersToShow,
      cmd: modelsCommand.meta as any,
    })).rejects.toThrow()

    expect(mockHandleCliError).toHaveBeenCalledWith(
      'Invalid provider "invalid-provider"',
      `Available providers: ${providers.join(', ')}`,
    )
    expect(mockConsoleLog).not.toHaveBeenCalled()
  })
})
