import process from 'node:process'
import type OpenAI from 'openai'
import { loadConfig } from 'unconfig'
import { simpleMerge } from '@cross/deepmerge'

export const integrations = [
  'astro',
  'astro-routing',
  'nextjs',
  '@nuxtjs/i18n',
  'sveltekit-i18n',
] as const

export type Integration = typeof integrations[number]

export interface Config {
  /**
   * project root
   * @default process.cwd()
   */
  cwd?: string

  /**
   * the i18n integration used, by default `lin` will try to infer this
   * @default undefined
   */
  i18n?: Integration

  /**
   * OpenAI chat model to use
   * @default gpt-4o
   */
  model?: OpenAI.ChatModel

  /**
   * the environment variable that contains the OpenAI token.
   * @default OPENAI_API_TOKEN
   */
  tokenEnv?: string
}

export const DEFAULT_CONFIG: Config = {
  cwd: '',
  model: 'gpt-4o',
  tokenEnv: 'OPENAI_API_TOKEN',
}

export async function resolveConfig<T extends Config>(
  options: T,
): Promise<ReturnType<typeof loadConfig<Config>>> {
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
    config: simpleMerge(config, options),
    sources,
    dependencies,
  }
}

export function defineConfig(config: Partial<Config>): Config {
  return config
}
