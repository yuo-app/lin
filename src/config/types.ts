import type { ArgDef, BooleanArgDef, StringArgDef } from 'citty'
import type { availableModels, integrations, providers } from './constants'
import type { I18nConfig } from '@/config/i18n'

export interface ModelDefinition {
  value: string
  alias: string
  mode?: 'auto' | 'json' | 'custom'
  iq?: number
  speed?: number
}

export type Provider = (typeof providers)[number]

export type Models = Record<Provider, ModelDefinition[]>

type ModelValue<P extends Provider> = (typeof availableModels)[P][number]['value']

interface LLMOptions {
  /** Optional API key for the provider. If not set, the SDK will try to use the default environment variables. */
  apiKey?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  seed?: number
  mode?: 'auto' | 'json' | 'custom'
}

export interface AzureLLMProviderOptions extends LLMOptions {
  provider: 'azure'
  /**
   * For Azure, this is your deployment name.
   */
  model: ModelValue<'azure'> | (string & {})
  /** Azure resource name. Defaults to AZURE_OPENAI_RESOURCE_NAME env var. */
  resourceName?: string
  /** Custom API version. Defaults to a version like '2024-05-01-preview'. */
  apiVersion?: string
  /** URL prefix for API calls. Overrides resourceName if set. */
  baseURL?: string
}

type NonAzureProviderOptionsMap = {
  [P in Exclude<Provider, 'azure'>]: {
    provider: P
    /**
     * The model to use for the specified provider.
     * e.g., "gpt-4.1-mini" for "openai" provider.
     */
    model: ModelValue<P> | (string & {})
  } & LLMOptions
}

export type NonAzureLLMProviderOptions = NonAzureProviderOptionsMap[Exclude<Provider, 'azure'>]

export type LLMProviderOptions = AzureLLMProviderOptions | NonAzureLLMProviderOptions

export type PresetOptions = Partial<LLMProviderOptions> & { context?: string }

export type Integration = (typeof integrations)[number]

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

  /**
   * Enable/disable undo history.
   * @default true
   */
  undo: boolean
}

export interface LLMConfig {
  /**
   * extra information to include in the LLM system prompt
   */
  context: string

  /**
   * the i18n integration used
   * @default i18n
   */
  integration: Integration

  /**
   * The i18n configuration object.
   * @default undefined
   */
  i18n?: I18nConfig

  /**
   * LLM options
   */
  options: LLMProviderOptions

  /**
   * Saved model configurations that can be activated with the --model flag.
   */
  presets?: Record<string, PresetOptions>
}

export type Config = CommonConfig & LLMConfig

/**
 * Represents the configuration object after all sources (files, CLI, defaults)
 * have been merged and the i18n settings have been fully resolved.
 */
export type ResolvedConfig = Omit<Config, 'i18n'> & { i18n: I18nConfig }

export type ConfigToArgDef<T> = {
  [K in keyof T]: T[K] extends boolean
    ? BooleanArgDef
    : T[K] extends string
      ? StringArgDef
      : ArgDef
}
