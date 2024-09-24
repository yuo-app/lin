import type { Config } from './config'
import process from 'node:process'
import { loadConfig } from 'unconfig'

export interface I18nConfig {
  locales: string[]
  defaultLocale: string
  directory: string
}

export async function loadI18nConfig(options?: Config): Promise<{ i18n: I18nConfig, sources: string[] }> {
  const { config, sources } = await loadConfig<I18nConfig>({
    sources: [
      // Next.js
      {
        files: ['next.config'],
        async rewrite(config: any) {
          const resolved = await (typeof config === 'function' ? config() : config)
          return {
            locales: resolved.i18n?.locales,
            defaultLocale: resolved.i18n?.defaultLocale,
            directory: 'public/locales',
          }
        },
      },
      // Nuxt.js
      {
        files: ['nuxt.config'],
        async rewrite(config: any) {
          const resolved = await (typeof config === 'function' ? config() : config)
          return {
            locales: resolved.i18n?.locales?.map((l: any) => l.code),
            defaultLocale: resolved.i18n?.defaultLocale,
            directory: resolved.i18n?.langDir || 'locales',
          }
        },
      },
      // Vue I18n
      {
        files: ['vue.config'],
        rewrite(config: any) {
          return {
            locales: Object.keys(config.pluginOptions?.i18n?.locales || {}),
            defaultLocale: config.pluginOptions?.i18n?.locale,
            directory: 'src/locales',
          }
        },
      },
      // React-i18next
      {
        files: ['i18next-parser.config'],
        rewrite(config: any) {
          return {
            locales: config.locales,
            defaultLocale: config.defaultLocale,
            directory: config.output,
          }
        },
      },
      // Angular
      {
        files: 'angular.json',
        extensions: [],
        rewrite(config: any) {
          const project = Object.values(config.projects)[0] as any
          return {
            locales: project.i18n?.locales ? Object.keys(project.i18n.locales) : [],
            defaultLocale: project.i18n?.sourceLocale,
            directory: 'src/assets/i18n',
          }
        },
      },
      {
        files: ['lin.config'],
        rewrite(config: any) {
          return config?.i18n
        },
      },
      {
        files: [
          'i18n.config',
        ],
      },
    ],
    cwd: options?.cwd || process.cwd(),
    defaults: {
      locales: [],
      defaultLocale: 'en-US',
      directory: 'locales',
    },
    merge: false,
  })

  if (!config) {
    throw new Error('No i18n configuration found')
  }

  return { i18n: config, sources }
}
