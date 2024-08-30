import process from 'node:process'
import type OpenAI from 'openai'
import { loadConfig } from 'unconfig'
import { simpleMerge } from '@cross/deepmerge'
import type { ArgDef, StringArgDef } from 'citty'
import type { DeepRequired } from './utils'

type ChatModel = OpenAI.ChatModel
type OpenAIOptions = Partial<Pick<OpenAI.ChatCompletionCreateParamsNonStreaming, 'model'
| 'frequency_penalty'
| 'logit_bias'
| 'max_tokens'
| 'presence_penalty'
| 'seed'
| 'service_tier'
| 'temperature'
| 'top_p'>>

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

export interface Config {
  /**
   * project root
   * @default process.cwd()
   */
  cwd: string

  /**
   * the i18n integration used, by default `lin` will try to infer this
   * @default undefined
   */
  i18n: Integration

  /**
   * the environment variable that contains the OpenAI token.
   * @default OPENAI_API_TOKEN
   */
  env: string

  /**
   * the OpenAI options, like the model to use
   */
  options: OpenAIOptions

  /**
   * DEBUG mode
   * @default false
   */
  debug: boolean
}

export const DEFAULT_CONFIG = {
  i18n: 'i18n',
  cwd: '',
  env: 'OPENAI_API_TOKEN',
  options: {
    model: 'gpt-4o-mini',
    temperature: 0,
  },
  debug: false,
} satisfies Config

type Args = {
  [key in keyof Config as key extends 'options' ? never : key]: ArgDef
} & {
  model: ArgDef
  temperature: ArgDef
}

export const commonArgs: Args = {
  cwd: {
    alias: 'c',
    type: 'string',
    description: 'project root',
    default: process.cwd(),
  },
  i18n: {
    alias: 'i',
    type: 'string',
    description: 'the i18n integration used',
  },
  env: {
    alias: 'e',
    type: 'string',
    description: 'the environment variable that contains the OpenAI token',
    default: DEFAULT_CONFIG.env,
  },
  model: {
    alias: 'm',
    type: 'string',
    description: 'the model to use',
    default: DEFAULT_CONFIG.options.model,
  },
  temperature: {
    alias: 't',
    type: 'string',
    description: 'the temperature to use',
    default: DEFAULT_CONFIG.options.temperature.toString(),
  },
  debug: {
    alias: 'd',
    type: 'boolean',
    description: 'debug mode',
    default: DEFAULT_CONFIG.debug,
  },
}

export const models: ChatModel[] = [
  'gpt-4o',
  'gpt-4o-2024-05-13',
  'gpt-4o-2024-08-06',
  'gpt-4o-mini',
  'gpt-4o-mini-2024-07-18',
  'gpt-4-turbo',
  'gpt-4-turbo-2024-04-09',
  'gpt-4-0125-preview',
  'gpt-4-turbo-preview',
  'gpt-4-1106-preview',
  'gpt-4-vision-preview',
  'gpt-4',
  'gpt-4-0314',
  'gpt-4-0613',
  'gpt-4-32k',
  'gpt-4-32k-0314',
  'gpt-4-32k-0613',
  'gpt-3.5-turbo',
  'gpt-3.5-turbo-16k',
  'gpt-3.5-turbo-0301',
  'gpt-3.5-turbo-0613',
  'gpt-3.5-turbo-1106',
  'gpt-3.5-turbo-0125',
  'gpt-3.5-turbo-16k-0613',
]

function checkArg(name: string | undefined, list: readonly string[]) {
  if (name && !list.includes(name))
    throw new Error(`"\`${name}\`" is invalid, must be one of ${list.join(', ')}`)
}

function normalizeArgs(args: Partial<Args>): Partial<Config> {
  const normalized: Partial<Args> = { ...args }

  Object.entries(commonArgs).forEach(([fullName, def]) => {
    if ('alias' in def) {
      const fullKey = fullName as keyof Args
      const configKey = def.alias as keyof Args

      if (def.alias && normalized[configKey] !== undefined && normalized[fullKey] === undefined) {
        normalized[fullKey] = normalized[configKey]
        delete normalized[configKey]
      }
    }
  })

  const config = convertType(normalized)
  checkArg(config.i18n, integrations)
  checkArg(config.options?.model, models)

  return config
}

function convertType(config: any): Partial<Config> {
  const { model, temperature, ...rest } = config

  return {
    ...rest,
    options: {
      model,
      temperature,
    },
  }
}

export async function resolveConfig(
  args: Record<string, any>,
): Promise<ReturnType<typeof loadConfig<DeepRequired<Config>>>> {
  const options = normalizeArgs(args)

  const { config, sources, dependencies } = await loadConfig<Config>({
    sources: [
      {
        files: [
          'lin.config',
        ],
      },
      {
        files: [
          '.linrc',
        ],
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
    merge: true,
    defaults: DEFAULT_CONFIG,
  })

  return {
    config: simpleMerge(config, options) as DeepRequired<Config>,
    sources,
    dependencies,
  }
}

export function defineConfig(config: Partial<Config>): Partial<Config> {
  return config
}
