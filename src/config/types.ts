import type { I18nConfig } from '@/config/i18n'
import type { ArgDef, BooleanArgDef, StringArgDef } from 'citty'
import type { integrations, providers } from './constants'

export interface ModelDefinition {
  value: string
  alias: string
}

export type Provider = (typeof providers)[number]

export type Models = Record<Provider, ModelDefinition[]>

export interface LLMProviderOptionsBase {
  /**
   * The model to use for the specified provider.
   * e.g., "gpt-4.1-mini" for "openai" provider.
   * For Azure, this is your deployment name.
   */
  model: string
  /** Optional API key for the provider. If not set, the SDK will try to use the default environment variables. */
  apiKey?: string
  temperature?: number
  maxTokens?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  seed?: number
}

export interface AzureLLMProviderOptions extends LLMProviderOptionsBase {
  provider: 'azure'
  /** Azure resource name. Defaults to AZURE_OPENAI_RESOURCE_NAME env var. */
  resourceName?: string
  /** Custom API version. Defaults to a version like '2024-05-01-preview'. */
  apiVersion?: string
  /** URL prefix for API calls. Overrides resourceName if set. */
  baseURL?: string
}

export interface NonAzureLLMProviderOptions extends LLMProviderOptionsBase {
  provider: Exclude<Provider, 'azure'>
}

export type LLMProviderOptions = AzureLLMProviderOptions | NonAzureLLMProviderOptions

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
