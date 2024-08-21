import process from 'node:process'
import type OpenAI from 'openai'
import { loadConfig } from 'unconfig'
import { simpleMerge } from '@cross/deepmerge'
import type { ArgDef } from 'citty'

type ChatModel = OpenAI.ChatModel
type OpenAIOptions = Pick<OpenAI.ChatCompletionCreateParamsNonStreaming, 'model'
| 'frequency_penalty'
| 'logit_bias'
| 'max_tokens'
| 'presence_penalty'
| 'seed'
| 'service_tier'
| 'temperature'
| 'top_p'>

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
}

export const DEFAULT_CONFIG: Config = {
  i18n: 'i18n',
  cwd: '',
  env: 'OPENAI_API_TOKEN',
  options: {
    model: 'gpt-4o-mini',
    temperature: 0,
  },
}

type Args = {
  [key in keyof Config]: ArgDef
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
  },
  options: {
    alias: 'o',
    type: 'string',
    description: 'the OpenAI options, like the model to use',
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

function normalizeArgs(args: Partial<Config>): Partial<Config> {
  const normalized: Partial<Config> = { ...args } as any

  Object.entries(commonArgs).forEach(([fullName, def]) => {
    if ('alias' in def) {
      if (def.alias && normalized[def.alias as keyof Config] !== undefined && normalized[fullName as keyof Config] === undefined) {
        normalized[fullName as keyof Config] = normalized[def.alias as keyof Config] as any
        delete normalized[def.alias as keyof Config]
      }
    }
  })

  checkArg(normalized.i18n, integrations)
  checkArg(normalized.options?.model, models)
  console.log('options', normalized.options)
  console.log('options parsed', JSON.parse(normalized.options as unknown as string || '{}'))

  return normalized
}

export async function resolveConfig(
  args: Record<string, any>,
): Promise<ReturnType<typeof loadConfig<Config>>> {
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
    config: simpleMerge(config, options) as Config,
    sources,
    dependencies,
  }
}

export function defineConfig(config: Partial<Config>): Partial<Config> {
  return config
}
