import type { StringArgDef } from 'citty'
import type { CommonConfig, ConfigToArgDef, LinConfig } from './types'
import process from 'node:process'
import { DEFAULT_CONFIG, providers } from './constants'

type CommonArgs = ConfigToArgDef<CommonConfig>
type LLMArgs = Omit<ConfigToArgDef<LinConfig>, 'options' | 'i18n'> & {
  provider: StringArgDef
  model: StringArgDef
  mode: StringArgDef
  temperature: StringArgDef
  batchSize: StringArgDef
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
  undo: {
    type: 'boolean',
    description: 'Enable/disable undo history. Use --no-undo to disable.',
    default: true,
  },
} as const satisfies CommonArgs

export const llmArgs = {
  context: {
    alias: 'C',
    type: 'string',
    description: 'extra information to include in the LLM system prompt',
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
  },
  model: {
    alias: 'm',
    type: 'string',
    description: 'the model to use (e.g., gpt-4.1-mini)',
  },
  batchSize: {
    alias: 'b',
    type: 'string',
    description: 'the number of locales to process in a single batch',
  },
  mode: {
    type: 'string',
    description: 'the output mode to use for the LLM',
    valueHint: 'auto | json | custom',
  },
  temperature: {
    alias: 't',
    type: 'string',
    description: 'the temperature to use',
  },
  with: {
    alias: 'w',
    type: 'string',
    description: 'the context profile to use. (def, tgt, both, all, or locales like en)',
    default: DEFAULT_CONFIG.with,
  },
} as const satisfies LLMArgs

export const allArgs = { ...commonArgs, ...llmArgs }
