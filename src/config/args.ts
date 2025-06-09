import type { StringArgDef } from 'citty'
import type { CommonConfig, ConfigToArgDef, LLMConfig } from './types'
import process from 'node:process'
import { DEFAULT_CONFIG, providers } from './constants'

type CommonArgs = ConfigToArgDef<CommonConfig>
type LLMArgs = Omit<ConfigToArgDef<LLMConfig>, 'options' | 'i18n'> & {
  provider: StringArgDef
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
  integration: {
    alias: 'i',
    type: 'string',
    description: 'the i18n integration used',
    default: DEFAULT_CONFIG.integration,
  },
  provider: {
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
