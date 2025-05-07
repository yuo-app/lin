import type { ArgDef, BooleanArgDef, StringArgDef } from 'citty'
import type { I18nConfig } from './i18n'
import type { DeepRequired } from './types'
import process from 'node:process'
import deepmerge from 'deepmerge'
import { loadConfig } from 'unconfig'
import { handleCliError } from './utils' // Removed catchError, checkArg, added handleCliError

export interface ModelDefinition {
  value: string
  alias: string
}

export const providers = [
  'openai',
  'anthropic',
  'google',
  'xai',
  'mistral',
  'groq',
] as const

export type Provider = typeof providers[number]

export type Models = Record<Provider, ModelDefinition[]>

export interface LLMProviderOptions {
  /**
   * The LLM provider to use.
   */
  provider: Provider
  /**
   * The model to use for the specified provider.
   * e.g., "gpt-4o-mini" for "openai" provider.
   */
  model: string
  /**
   * Optional API key for the provider. If not set, the SDK will try to use environment variables.
   */
  apiKey?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  seed?: number
}

export const integrations = [
  'i18n',
  'i18next',
  'astro',
  'astro-routing',
  'nextjs',
  'vue-i18n',
  '@nuxtjs/i18n',
  'sveltekit-i18n',
] as const

export type Integration = typeof integrations[number]

export interface CommonConfig {
  /**
   * the locale to use
   * @field all: every locale
   * @field def: the default locale
   * @field en-US: a specific locale
   * @default all
   */
  locale: string

  /**
   * project root
   * @default process.cwd()
   */
  cwd: string

  /**
   * debug mode
   * @default false
   */
  debug: boolean
}

export interface LLMConfig {
  /**
   * extra information to include in the GPT system prompt
   */
  context: string

  /**
   * the i18n integration used, by default `lin` will try to infer this, or you can pass an i18n config object
   * @default undefined
   */
  i18n: Integration | I18nConfig

  /**
   * the LLM options, like the model to use
   */
  options: LLMProviderOptions
}

export type Config = CommonConfig & LLMConfig

export const DEFAULT_CONFIG = {
  locale: '',
  cwd: '',
  debug: false,

  context: '',
  i18n: 'i18n',
  options: {
    provider: 'openai', // Changed
    model: 'gpt-4o-mini', // Changed
    apiKey: undefined,
    temperature: 0,
  },
} satisfies Config

type ConfigToArgDef<T> = {
  [K in keyof T]: T[K] extends boolean
    ? BooleanArgDef
    : T[K] extends string
      ? StringArgDef
      : ArgDef
}

type CommonArgs = ConfigToArgDef<CommonConfig>
type LLMArgs = Omit<ConfigToArgDef<LLMConfig>, 'options'> & {
  provider: StringArgDef // Added
  model: StringArgDef
  temperature: StringArgDef
}

export const commonArgs = {
  locale: {
    alias: 'l',
    type: 'string',
    description: 'only act on a specific locale',
    default: DEFAULT_CONFIG.locale,
  },
  cwd: {
    alias: 'c',
    type: 'string',
    description: 'project root',
    default: process.cwd(),
  },
  debug: {
    alias: 'd',
    type: 'boolean',
    description: 'debug mode',
    default: false,
  },
} as const satisfies CommonArgs

export const llmArgs = {
  context: {
    alias: 'C',
    type: 'string',
    description: 'extra information to include in the GPT system prompt',
    default: DEFAULT_CONFIG.context,
  },
  i18n: {
    alias: 'i',
    type: 'string',
    description: 'the i18n integration used',
    default: 'i18n',
  },
  provider: { // Added provider argument
    alias: 'p',
    type: 'string',
    description: `the LLM provider to use (e.g., ${providers.join(', ')})`,
    default: DEFAULT_CONFIG.options.provider,
  },
  model: {
    alias: 'm',
    type: 'string',
    description: 'the model to use (e.g., gpt-4o-mini)',
    default: DEFAULT_CONFIG.options.model,
  },
  temperature: {
    alias: 't',
    type: 'string',
    description: 'the temperature to use',
    default: DEFAULT_CONFIG.options.temperature.toString(),
  },
} as const satisfies LLMArgs

export const allArgs = { ...commonArgs, ...llmArgs }

export const availableModels: Models = {
  openai: [
    { value: 'gpt-4.1', alias: 'GPT 4.1' },
    { value: 'gpt-4.1-mini', alias: 'GPT 4.1 mini' },
    { value: 'gpt-4.1-nano', alias: 'GPT 4.1 nano' },
    { value: 'o4-mini', alias: 'o4 mini' },
    { value: 'o3', alias: 'o3' },
    { value: 'o3-mini', alias: 'o3 mini' },
    { value: 'gpt-4o', alias: 'GPT 4o' },
    { value: 'gpt-4o-mini', alias: 'GPT 4o mini' },
  ],
  anthropic: [
    { value: 'claude-3-7-sonnet-latest', alias: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet-latest', alias: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-latest', alias: 'Claude 3.5 Haiku' },
  ],
  google: [
    { value: 'gemini-2.5-pro-exp-05-06', alias: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash-preview-04-17', alias: 'Gemini 2.5 Flash' },
    { value: 'gemini-2.0-flash', alias: 'Gemini 2.0 Flash' },
    { value: 'gemini-2.0-flash-lite', alias: 'Gemini 2.0 Flash Lite' },
  ],
  xai: [
    { value: 'grok-3', alias: 'Grok 3' },
    { value: 'grok-3-mini', alias: 'Grok 3 mini' },
    { value: 'grok-3-fast', alias: 'Grok 3 fast' },
    { value: 'grok-3-mini-fast', alias: 'Grok 3 mini fast' },
  ],
  mistral: [
    { value: 'mistral-large-latest', alias: 'Mistral Large' },
    { value: 'mistral-small-latest', alias: 'Mistral Small' },
    { value: 'open-mixtral-8x22b', alias: 'Open Mixtral 8x22B' },
    { value: 'open-mixtral-8x7b', alias: 'Open Mixtral 8x7B' },
    { value: 'open-mistral-7b', alias: 'Open Mistral 7B' },
  ],
  groq: [
    { value: 'deepseek-r1-distill-llama-70b', alias: 'DeepSeek R1 Distill Llama 70B' },
    { value: 'qwen-qwq-32b', alias: 'QwQ 32B' },
    { value: 'meta-llama/llama-4-maverick-17b-128e-instruct', alias: 'Llama 4 Maverick' },
    { value: 'meta-llama/llama-4-scout-17b-16e-instruct', alias: 'Llama 4 Scout' },
    { value: 'llama-3.3-70b-versatile', alias: 'Llama 3.3 70B' },
    { value: 'llama-3.1-8b-instant', alias: 'Llama 3.1 8B Instant' },
    { value: 'gemma2-9b-it', alias: 'Gemma2 9B IT' },
  ],
}

function normalizeArgs(args: Record<string, any>): Partial<Config> {
  // collect only the LLM‐related overrides
  const cliOpts: Partial<LLMProviderOptions> = {}
  if (args.provider) {
    if (!providers.includes(args.provider))
      handleCliError(`Invalid provider "${args.provider}"`, `Available providers: ${providers.join(', ')}`)
    cliOpts.provider = args.provider as Provider
  }
  if (args.model)
    cliOpts.model = args.model
  if (args.apiKey)
    cliOpts.apiKey = args.apiKey
  if (args.temperature !== undefined) {
    const t = Number(args.temperature)
    if (Number.isNaN(t))
      handleCliError(`Invalid temperature "${args.temperature}"`)
    cliOpts.temperature = t
  }

  // only merge into options if any LLM flag was set
  const options = Object.keys(cliOpts).length
    ? { ...DEFAULT_CONFIG.options, ...cliOpts }
    : undefined

  // build partial Config override
  const cfg: Partial<Config> = {
    ...(args.locale ? { locale: args.locale } : {}),
    ...(args.cwd ? { cwd: args.cwd } : {}),
    ...(args.debug ? { debug: args.debug } : {}),
    ...(args.context ? { context: args.context } : {}),
    ...(args.i18n ? { i18n: args.i18n } : {}),
    ...(options ? { options } : {}),
  }

  // validate model vs provider
  if (options) {
    const { provider, model } = options
    const models = availableModels[provider] || []
    if (!models.some(m => m.value === model)) {
      handleCliError(
        `Model "${model}" not found for provider "${provider}".`,
        `Available: ${models.map(m => m.value).join(', ')}`,
      )
    }
  }

  return cfg
}

export async function resolveConfig(
  args: Record<string, any>,
): Promise<ReturnType<typeof loadConfig<DeepRequired<Config>>>> {
  const options = normalizeArgs(args)

  const { config, sources, dependencies } = await loadConfig<Config>({
    sources: [
      {
        files: ['lin.config'],
      },
      {
        files: ['.linrc'],
      },
      {
        files: 'package.json',
        extensions: [],
        rewrite(config: any) {
          return config?.lin
        },
      },
      {
        files: ['vite.config', 'nuxt.config'],
        async rewrite(config) {
          const resolved = await (typeof config === 'function' ? config() : config)
          return resolved?.lin
        },
      },
    ],
    cwd: options.cwd || process.cwd(),
    merge: false,
    defaults: DEFAULT_CONFIG,
  })

  return {
    config: deepmerge(config, options) as DeepRequired<Config>,
    sources,
    dependencies,
  }
}

export function defineConfig(
  config: Omit<Partial<Config>, 'locale' | 'debug'>,
): Partial<Config> {
  return config
}

export function defineI18nConfig(config: I18nConfig): I18nConfig {
  return config
}
