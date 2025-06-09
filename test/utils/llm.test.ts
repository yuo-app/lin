import type { Config, Provider } from '@/config'
import type { I18nConfig } from '@/config/i18n'
import type { DeepRequired } from '@/types'
import type { LocaleJson } from '@/utils/locale'
import type { confirm as confirmFnType } from '@clack/prompts'
import type { MockedFunction } from 'vitest'
import { deletionGuard, getWithLocales, translateKeys } from '@/utils/llm'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockLanguageModelFn = vi.fn().mockReturnValue({})
const mockProviderClient = { languageModel: mockLanguageModelFn }

const mockCreateOpenAI = vi.fn((_options?: any) => mockProviderClient)
const mockCreateAnthropic = vi.fn((_options?: any) => mockProviderClient)
const mockCreateGoogleGenerativeAI = vi.fn((_options?: any) => mockProviderClient)
const mockCreateXai = vi.fn((_options?: any) => mockProviderClient)
const mockCreateMistral = vi.fn((_options?: any) => mockProviderClient)
const mockCreateGroq = vi.fn((_options?: any) => mockProviderClient)
const mockCreateAzure = vi.fn((_options?: any) => mockProviderClient)
const mockGenerateObject = vi.fn()

vi.mock('@/utils/console', () => ({
  console: {
    logL: vi.fn(),
    log: vi.fn(),
    loading: vi.fn((_message, callback) => callback()),
  },
  formatLog: vi.fn(str => str),
  ICONS: { result: '>.. ', warning: '⚠', error: '✗', info: 'ℹ' },
}))

vi.mock('@clack/prompts', async () => {
  const actual = await vi.importActual('@clack/prompts')
  return {
    ...actual,
    confirm: vi.fn(),
  }
})

vi.mock('@ai-sdk/openai', () => ({ createOpenAI: (options?: any) => mockCreateOpenAI(options) }))
vi.mock('@ai-sdk/anthropic', () => ({ createAnthropic: (options?: any) => mockCreateAnthropic(options) }))
vi.mock('@ai-sdk/google', () => ({ createGoogleGenerativeAI: (options?: any) => mockCreateGoogleGenerativeAI(options) }))
vi.mock('@ai-sdk/xai', () => ({ createXai: (options?: any) => mockCreateXai(options) }))
vi.mock('@ai-sdk/mistral', () => ({ createMistral: (options?: any) => mockCreateMistral(options) }))
vi.mock('@ai-sdk/groq', () => ({ createGroq: (options?: any) => mockCreateGroq(options) }))
vi.mock('@ai-sdk/azure', () => ({ createAzure: (options?: any) => mockCreateAzure(options) }))
vi.mock('ai', () => ({ generateObject: (...args: any[]) => mockGenerateObject(...args) }))
vi.mock('@/utils/general', async () => {
  const { customMockHandleCliError } = await import('../mocks/general.mock')
  return {
    handleCliError: customMockHandleCliError,
  }
})

const { MOCKED_CLI_ERROR_MESSAGE } = await import('../mocks/general.mock')
const { console: mockConsole, ICONS: mockICONS, formatLog: mockFormatLog } = await import('@/utils/console')
const { confirm: clackConfirm } = await import('@clack/prompts')
const mockConfirm = clackConfirm as MockedFunction<typeof confirmFnType>
const { handleCliError: mockHandleCliError } = await import('@/utils/general')

describe('llm utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateOpenAI.mockReturnValue({ languageModel: mockLanguageModelFn })
    mockCreateAnthropic.mockReturnValue({ languageModel: mockLanguageModelFn })
    mockCreateGoogleGenerativeAI.mockReturnValue({ languageModel: mockLanguageModelFn })
    mockCreateXai.mockReturnValue({ languageModel: mockLanguageModelFn })
    mockCreateMistral.mockReturnValue({ languageModel: mockLanguageModelFn })
    mockCreateGroq.mockReturnValue({ languageModel: mockLanguageModelFn })
    mockCreateAzure.mockReturnValue({ languageModel: mockLanguageModelFn })
  })

  describe('getWithLocales', () => {
    const i18nConfig: I18nConfig = {
      locales: ['en-US', 'es-ES', 'fr-FR', 'ja-JP'],
      defaultLocale: 'en-US',
      directory: 'locales',
    }

    it('should return empty withLocales and includeContext false if withLocale is a single empty string', () => {
      const result = getWithLocales('', i18nConfig)
      expect(result.withLocales).toEqual([])
      expect(result.includeContext).toBe(false)
    })

    it('should return the normalized locale in withLocales and includeContext true if withLocale array has only one valid item', () => {
      const result = getWithLocales(['en'], i18nConfig)
      expect(result.withLocales).toEqual(['en-US'])
      expect(result.includeContext).toBe(true)
    })

    it('should return empty withLocales and includeContext false if withLocale array has one item which is empty string', () => {
      const result = getWithLocales([''], i18nConfig)
      expect(result.withLocales).toEqual([])
      expect(result.includeContext).toBe(false)
    })

    it('should process a single valid locale string (excluding empty string)', () => {
      const result = getWithLocales('es', i18nConfig)
      expect(result.withLocales).toEqual(['es-ES'])
      expect(result.includeContext).toBe(true)
    })

    it('should process a single specific locale string like "ja-JP"', () => {
      const result = getWithLocales('ja-JP', i18nConfig)
      expect(result.withLocales).toEqual(['ja-JP'])
      expect(result.includeContext).toBe(true)
    })

    it('should process an array of locale strings', () => {
      const result = getWithLocales(['es', 'fr'], i18nConfig)
      expect(result.withLocales).toEqual(['es-ES', 'fr-FR'])
      expect(result.includeContext).toBe(true)
    })

    it('should set includeContext to false if "" is in withLocale array but other valid locales are present', () => {
      const result = getWithLocales(['es', 'fr', ''], i18nConfig)
      expect(result.withLocales).toEqual(['es-ES', 'fr-FR'])
      expect(result.includeContext).toBe(true)
    })

    it('should handle empty array for withLocale', () => {
      const result = getWithLocales([], i18nConfig)
      expect(result.withLocales).toEqual([])
      expect(result.includeContext).toBe(false)
    })

    it('should handle undefined for withLocale', () => {
      const result = getWithLocales(undefined, i18nConfig)
      expect(result.withLocales).toEqual([])
      expect(result.includeContext).toBe(false)
    })
  })

  describe('deletionGuard', () => {
    const keyCountsBefore = { 'en-US': 10, 'es-ES': 8 }
    const locales = ['en-US', 'es-ES']

    it('should return true if no keys are deleted', async () => {
      const keyCountsAfter = { 'en-US': 10, 'es-ES': 8 }
      const result = await deletionGuard(keyCountsBefore, keyCountsAfter, locales)
      expect(result).toBe(true)
      expect(mockConfirm).not.toHaveBeenCalled()
      expect(mockConsole.logL).toHaveBeenCalledWith(mockICONS.result)
      expect(mockConsole.logL).toHaveBeenCalledWith('en-US (0), ')
      expect(mockConsole.logL).toHaveBeenCalledWith('es-ES (0)')
      expect(mockConsole.log).toHaveBeenCalledTimes(1)
    })

    it('should prompt and return true if keys are deleted and user confirms', async () => {
      const keyCountsAfter = { 'en-US': 8, 'es-ES': 7 }
      mockConfirm.mockResolvedValue(true)
      const result = await deletionGuard(keyCountsBefore, keyCountsAfter, locales)
      expect(result).toBe(true)
      expect(mockConfirm).toHaveBeenCalledWith({
        message: mockFormatLog(`${mockICONS.warning} This will remove \`2\` keys from **en-US**, \`1\` keys from **es-ES**. Continue?`),
        initialValue: false,
      })
      expect(mockConsole.logL).toHaveBeenCalledWith('en-US (-2), ')
      expect(mockConsole.logL).toHaveBeenCalledWith('es-ES (-1)')
    })

    it('should prompt and return false if keys are deleted and user cancels', async () => {
      const keyCountsAfter = { 'en-US': 8, 'es-ES': 7 }
      mockConfirm.mockResolvedValue(false)
      const result = await deletionGuard(keyCountsBefore, keyCountsAfter, locales)
      expect(result).toBe(false)
      expect(mockConfirm).toHaveBeenCalled()
    })

    it('should handle single locale deletion', async () => {
      const keyCountsBeforeSingle = { 'en-US': 10 }
      const keyCountsAfterSingle = { 'en-US': 8 }
      const localesSingle = ['en-US']
      mockConfirm.mockResolvedValue(true)

      const result = await deletionGuard(keyCountsBeforeSingle, keyCountsAfterSingle, localesSingle)
      expect(result).toBe(true)
      expect(mockConsole.logL).toHaveBeenCalledWith('en-US (-2)')
      expect(mockConfirm).toHaveBeenCalledWith({
        message: mockFormatLog(`${mockICONS.warning} This will remove \`2\` keys from **en-US**. Continue?`),
        initialValue: false,
      })
    })

    it('should correctly log for multiple locales with deletions and additions', async () => {
      const keyCountsBeforeMulti = { 'en-US': 10, 'es-ES': 8, 'fr-FR': 12 }
      const keyCountsAfterMulti = { 'en-US': 8, 'es-ES': 9, 'fr-FR': 12 }
      const localesMulti = ['en-US', 'es-ES', 'fr-FR']
      mockConfirm.mockResolvedValue(true)

      const result = await deletionGuard(keyCountsBeforeMulti, keyCountsAfterMulti, localesMulti)
      expect(result).toBe(true)
      expect(mockConsole.logL).toHaveBeenCalledWith(mockICONS.result)
      expect(mockConsole.logL).toHaveBeenCalledWith('en-US (-2), ')
      expect(mockConsole.logL).toHaveBeenCalledWith('es-ES (+1), ')
      expect(mockConsole.logL).toHaveBeenCalledWith('fr-FR (0)')
      expect(mockConsole.log).toHaveBeenCalledTimes(1)
      expect(mockConfirm).toHaveBeenCalledWith({
        message: mockFormatLog(`${mockICONS.warning} This will remove \`2\` keys from **en-US**. Continue?`),
        initialValue: false,
      })
    })
  })

  describe('translateKeys', () => {
    const mockConfigBase: DeepRequired<Config> = {
      locale: 'all',
      cwd: '/mock',
      debug: false,
      context: 'Test context about the project.',
      integration: 'i18n',
      i18n: { locales: ['en-US', 'es-ES', 'fr-FR'], defaultLocale: 'en-US', directory: 'locales' },
      options: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        apiKey: 'test-api-key',
        temperature: 0.7,
        maxTokens: 150,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
        seed: 12345,
      },
    }

    const mockI18n: I18nConfig = {
      locales: ['en-US', 'es-ES', 'fr-FR'],
      defaultLocale: 'en-US',
      directory: 'locales',
    }

    const keysToTranslate: Record<string, LocaleJson> = {
      'es-ES': { greeting: 'Hello', farewell: 'Goodbye' },
      'fr-FR': { greeting: 'Hello', farewell: 'Goodbye' },
    }

    const mockTranslatedJson: Record<string, LocaleJson> = {
      'es-ES': { greeting: 'Hola', farewell: 'Adiós' },
      'fr-FR': { greeting: 'Bonjour', farewell: 'Au revoir' },
    }

    beforeEach(() => {
      vi.clearAllMocks()
      mockGenerateObject.mockResolvedValue({ object: mockTranslatedJson })
      mockCreateOpenAI.mockReturnValue({ languageModel: mockLanguageModelFn })
      mockCreateAnthropic.mockReturnValue({ languageModel: mockLanguageModelFn })
      mockCreateGoogleGenerativeAI.mockReturnValue({ languageModel: mockLanguageModelFn })
      mockCreateXai.mockReturnValue({ languageModel: mockLanguageModelFn })
      mockCreateMistral.mockReturnValue({ languageModel: mockLanguageModelFn })
      mockCreateGroq.mockReturnValue({ languageModel: mockLanguageModelFn })
      mockCreateAzure.mockReturnValue({ languageModel: mockLanguageModelFn })
    })

    it('should correctly call generateObject and return translations for OpenAI', async () => {
      const result = await translateKeys(keysToTranslate, mockConfigBase, mockI18n, undefined, true)

      expect(result).toEqual(mockTranslatedJson)
      expect(mockCreateOpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' })
      expect(mockLanguageModelFn).toHaveBeenCalledWith('gpt-4o-mini')
      expect(mockGenerateObject).toHaveBeenCalledOnce()
      const generateObjectCall = mockGenerateObject.mock.calls[0][0]
      expect(generateObjectCall.model).toEqual({})
      expect(generateObjectCall.schema).toBeDefined()
      expect(generateObjectCall.system).toContain('You are a translation API')
      expect(generateObjectCall.system).toContain(`default locale (${mockI18n.defaultLocale})`)
      expect(generateObjectCall.system).toContain(mockConfigBase.context)
      expect(generateObjectCall.prompt).toBe(JSON.stringify(keysToTranslate))
      expect(generateObjectCall.temperature).toBe(mockConfigBase.options.temperature)
      expect(generateObjectCall.maxTokens).toBe(mockConfigBase.options.maxTokens)
      expect(generateObjectCall.topP).toBe(mockConfigBase.options.topP)
      expect(generateObjectCall.frequencyPenalty).toBe(mockConfigBase.options.frequencyPenalty)
      expect(generateObjectCall.presencePenalty).toBe(mockConfigBase.options.presencePenalty)
      expect(generateObjectCall.seed).toBe(mockConfigBase.options.seed)
      expect(generateObjectCall.mode).toBe('auto')
    })

    it('should include withLocaleJsons in system prompt if provided', async () => {
      const withLocaleJsons = { 'ja-JP': { common: { yes: 'はい' } } }
      await translateKeys(keysToTranslate, mockConfigBase, mockI18n, withLocaleJsons, true)

      expect(mockGenerateObject).toHaveBeenCalledOnce()
      const generateObjectCall = mockGenerateObject.mock.calls[0][0]
      expect(generateObjectCall.system).toContain(JSON.stringify(withLocaleJsons))
    })

    it('should exclude user context from system prompt if includeContext is false', async () => {
      await translateKeys(keysToTranslate, mockConfigBase, mockI18n, undefined, false)

      expect(mockGenerateObject).toHaveBeenCalledOnce()
      const generateObjectCall = mockGenerateObject.mock.calls[0][0]
      expect(generateObjectCall.system).not.toContain(mockConfigBase.context)
    })

    it('should handle missing provider in config', async () => {
      const configNoProvider = {
        ...mockConfigBase,
        options: { ...mockConfigBase.options, provider: '' as unknown as Provider, model: mockConfigBase.options.model },
      } as DeepRequired<Config>
      await expect(translateKeys(keysToTranslate, configNoProvider, mockI18n))
        .rejects
        .toThrow(MOCKED_CLI_ERROR_MESSAGE)

      expect(mockHandleCliError).toHaveBeenCalledWith(
        expect.stringContaining('Provider or modelId missing'),
        expect.arrayContaining([expect.stringContaining('Provider: '), expect.stringContaining(`Model: ${mockConfigBase.options.model}`)]),
      )
    })

    it('should handle missing modelId in config', async () => {
      const configNoModel = {
        ...mockConfigBase,
        options: { ...mockConfigBase.options, provider: mockConfigBase.options.provider, model: '' },
      } as DeepRequired<Config>
      await expect(translateKeys(keysToTranslate, configNoModel, mockI18n))
        .rejects
        .toThrow(MOCKED_CLI_ERROR_MESSAGE)

      expect(mockHandleCliError).toHaveBeenCalledWith(
        expect.stringContaining('Provider or modelId missing'),
        expect.arrayContaining([expect.stringContaining(`Provider: ${mockConfigBase.options.provider}`), expect.stringContaining('Model: ')]),
      )
    })

    it('should propagate errors from generateObject', async () => {
      const error = new Error('LLM API Error')
      mockGenerateObject.mockRejectedValue(error)
      await expect(translateKeys(keysToTranslate, mockConfigBase, mockI18n)).rejects.toThrow(error)
    })

    it('should not pass apiKey if not provided in config', async () => {
      const testConfigWithEmptyApiKey = {
        ...mockConfigBase,
        options: { ...mockConfigBase.options, apiKey: '' },
      } as DeepRequired<Config>
      await translateKeys(keysToTranslate, testConfigWithEmptyApiKey, mockI18n)
      expect(mockCreateOpenAI).toHaveBeenCalledWith({})
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })

    it('should use openai provider when specified', async () => {
      const openAIConfig = {
        ...mockConfigBase,
      } as DeepRequired<Config>
      await translateKeys(keysToTranslate, openAIConfig, mockI18n)
      expect(mockCreateOpenAI).toHaveBeenCalledWith({ apiKey: 'test-api-key' })
      expect(mockLanguageModelFn).toHaveBeenCalledWith('gpt-4o-mini')
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })

    const providers: Provider[] = ['anthropic', 'google', 'xai', 'mistral', 'groq']
    const providerMocks = {
      openai: mockCreateOpenAI,
      anthropic: mockCreateAnthropic,
      google: mockCreateGoogleGenerativeAI,
      xai: mockCreateXai,
      mistral: mockCreateMistral,
      groq: mockCreateGroq,
      azure: mockCreateAzure,
    }

    providers.forEach((provider) => {
      it(`should use ${provider} provider when specified`, async () => {
        const currentProvider = provider as Exclude<Provider, 'azure'>
        const providerConfig = {
          ...mockConfigBase,
          options: {
            ...mockConfigBase.options,
            provider: currentProvider,
            model: `test-${currentProvider}-model`,
          },
        } as DeepRequired<Config>
        await translateKeys(keysToTranslate, providerConfig, mockI18n)
        expect(providerMocks[currentProvider]).toHaveBeenCalledWith({ apiKey: 'test-api-key' })
        expect(mockLanguageModelFn).toHaveBeenCalledWith(`test-${currentProvider}-model`)
        expect(mockGenerateObject).toHaveBeenCalledOnce()
        mockGenerateObject.mockClear()
        ;(providerMocks[currentProvider] as MockedFunction<any>).mockClear()
        mockLanguageModelFn.mockClear()
      })
    })

    it('should use azure provider with resourceName and apiKey', async () => {
      const azureConfig = {
        ...mockConfigBase,
        options: {
          model: 'my-azure-deployment',
          apiKey: 'azure-api-key',
          temperature: mockConfigBase.options.temperature,
          maxTokens: mockConfigBase.options.maxTokens,
          topP: mockConfigBase.options.topP,
          frequencyPenalty: mockConfigBase.options.frequencyPenalty,
          presencePenalty: mockConfigBase.options.presencePenalty,
          seed: mockConfigBase.options.seed,
          provider: 'azure' as const,
          resourceName: 'my-resource',
          apiVersion: '2024-00-00',
          baseURL: 'https://default.azure.com',
        },
      } as DeepRequired<Config>
      await translateKeys(keysToTranslate, azureConfig, mockI18n)
      expect(mockCreateAzure).toHaveBeenCalledWith({ apiKey: 'azure-api-key', resourceName: 'my-resource', apiVersion: '2024-00-00', baseURL: 'https://default.azure.com' })
      expect(mockLanguageModelFn).toHaveBeenCalledWith('my-azure-deployment')
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })

    it('should use azure provider with baseURL, apiKey, and apiVersion, ignoring resourceName', async () => {
      const azureConfig = {
        ...mockConfigBase,
        options: {
          model: 'my-azure-deployment-2',
          apiKey: 'azure-api-key-2',
          temperature: mockConfigBase.options.temperature,
          maxTokens: mockConfigBase.options.maxTokens,
          topP: mockConfigBase.options.topP,
          frequencyPenalty: mockConfigBase.options.frequencyPenalty,
          presencePenalty: mockConfigBase.options.presencePenalty,
          seed: mockConfigBase.options.seed,
          provider: 'azure' as const,
          resourceName: 'should-be-ignored',
          baseURL: 'https://mycustom.azure.com',
          apiVersion: '2024-05-01',
        },
      } as DeepRequired<Config>
      await translateKeys(keysToTranslate, azureConfig, mockI18n)
      expect(mockCreateAzure).toHaveBeenCalledWith({
        apiKey: 'azure-api-key-2',
        baseURL: 'https://mycustom.azure.com',
        apiVersion: '2024-05-01',
        resourceName: 'should-be-ignored',
      })
      expect(mockLanguageModelFn).toHaveBeenCalledWith('my-azure-deployment-2')
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })

    it('should use azure provider with only apiKey (relying on env vars for resourceName)', async () => {
      const azureConfig = {
        ...mockConfigBase,
        options: {
          model: 'env-based-deployment',
          apiKey: 'azure-api-key-env',
          temperature: mockConfigBase.options.temperature,
          maxTokens: mockConfigBase.options.maxTokens,
          topP: mockConfigBase.options.topP,
          frequencyPenalty: mockConfigBase.options.frequencyPenalty,
          presencePenalty: mockConfigBase.options.presencePenalty,
          seed: mockConfigBase.options.seed,
          provider: 'azure' as const,
          resourceName: '',
          apiVersion: '',
          baseURL: '',
        },
      } as DeepRequired<Config>
      await translateKeys(keysToTranslate, azureConfig, mockI18n)
      expect(mockCreateAzure).toHaveBeenCalledWith({ apiKey: 'azure-api-key-env' })
      expect(mockLanguageModelFn).toHaveBeenCalledWith('env-based-deployment')
      expect(mockGenerateObject).toHaveBeenCalledOnce()
    })

    it('should handle unsupported provider', async () => {
      const unsupportedProviderConfig = {
        ...mockConfigBase,
        options: {
          ...mockConfigBase.options,
          provider: 'unsupported' as Provider,
        },
      } as DeepRequired<Config>
      await expect(translateKeys(keysToTranslate, unsupportedProviderConfig, mockI18n))
        .rejects
        .toThrow(MOCKED_CLI_ERROR_MESSAGE)

      expect(mockHandleCliError).toHaveBeenCalledWith(
        'Unsupported provider: unsupported',
        'Supported providers are: openai, anthropic, google, xai, mistral, groq, azure.',
      )
    })
  })
})
