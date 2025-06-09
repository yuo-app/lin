import type { DeepRequired } from '../types'
import type { I18nConfig } from './i18n'
import type * as ConfigTypes from './types'
import process from 'node:process'
import deepmerge from 'deepmerge'
import { loadConfig } from 'unconfig'
import * as ConfigConstants from './constants'
import { normalizeArgs } from './helpers'
import { DEFAULT_I18N_CONFIG, loadI18nConfig } from './i18n'

export {
  allArgs,
  commonArgs,
  llmArgs,
} from './args'

export {
  availableModels,
  DEFAULT_CONFIG,
  integrations,
  type ModelAlias,
  type ModelValue,
  providers,
} from './constants'

export {
  DEFAULT_I18N_CONFIG,
  type I18nConfig,
  loadI18nConfig,
} from './i18n'

export type {
  AzureLLMProviderOptions,
  CommonConfig,
  Config,
  Integration,
  LLMConfig,
  LLMProviderOptions,
  ModelDefinition,
  Models,
  Provider,
  ResolvedConfig,
} from './types'

export async function resolveConfig(
  args: Record<string, any>,
): Promise<ReturnType<typeof loadConfig<DeepRequired<ConfigTypes.ResolvedConfig>>>> {
  const cliProvidedArgs = normalizeArgs(args)

  const { config: loadedFromFileConfig, sources, dependencies } = await loadConfig<ConfigTypes.Config>({
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
    cwd: cliProvidedArgs.cwd || process.cwd(),
    merge: false,
    defaults: ConfigConstants.DEFAULT_CONFIG,
  })

  const configForI18nResolution = deepmerge(loadedFromFileConfig, cliProvidedArgs) as ConfigTypes.Config
  const { i18n: loadedI18nObject } = await loadI18nConfig(configForI18nResolution)

  const resolvedI18nObject
    = cliProvidedArgs.i18n && typeof cliProvidedArgs.i18n === 'object'
      ? { ...DEFAULT_I18N_CONFIG, ...cliProvidedArgs.i18n }
      : loadedI18nObject

  const finalMergedConfig = deepmerge.all(
    [
      ConfigConstants.DEFAULT_CONFIG,
      loadedFromFileConfig,
      cliProvidedArgs,
      { i18n: resolvedI18nObject },
    ],
    { arrayMerge: (_t, s) => s },
  ) as DeepRequired<ConfigTypes.ResolvedConfig>

  if (finalMergedConfig.options.provider !== 'azure') {
    delete (finalMergedConfig.options as any).resourceName
    delete (finalMergedConfig.options as any).apiVersion
    delete (finalMergedConfig.options as any).baseURL
  }

  return { config: finalMergedConfig, sources, dependencies }
}

export function defineConfig(
  config: Partial<Omit<ConfigTypes.Config, 'locale' | 'debug'>>,
): Partial<ConfigTypes.Config> {
  return config as Partial<ConfigTypes.Config>
}

export function defineI18nConfig(config: I18nConfig): I18nConfig {
  return config
}
