import type { Config } from '@/config'
import path from 'node:path'
import process from 'node:process'
import { loadConfig } from 'unconfig'
import { handleCliError } from '../utils'

export interface I18nConfig {
  locales: string[]
  defaultLocale: string
  directory: string
}

export const DEFAULT_I18N_CONFIG: I18nConfig = {
  locales: [],
  defaultLocale: 'en-US',
  directory: 'locales',
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
            directory: config.pluginOptions?.i18n?.localeDir || 'src/locales',
          }
        },
      },
      // React-i18next
      {
        files: ['i18next-parser.config'],
        rewrite(config: any) {
          let directory = 'public/locales'
          if (config.output) {
            const parts = config.output.split('/$LOCALE')
            directory = parts[0]
          }
          return {
            locales: config.locales,
            defaultLocale: config.defaultLocale,
            directory,
          }
        },
      },
      // Angular
      {
        files: 'angular.json',
        extensions: [],
        rewrite(config: any) {
          const projectName = config.defaultProject || (config.projects ? Object.keys(config.projects)[0] : undefined)
          if (!projectName || !config.projects?.[projectName])
            return {}
          const project = config.projects[projectName]

          if (!project.i18n)
            return {}

          const localeFilePaths = project.i18n.locales ? Object.values(project.i18n.locales) : []
          let directory = 'src/assets/i18n'

          if (localeFilePaths.length > 0 && typeof localeFilePaths[0] === 'string')
            directory = path.dirname(localeFilePaths[0])

          return {
            locales: project.i18n?.locales ? Object.keys(project.i18n.locales) : [],
            defaultLocale: project.i18n?.sourceLocale,
            directory,
          }
        },
      },
      {
        files: ['i18n.config'],
      },
      {
        files: ['.1i8nrc'],
      },
      {
        files: ['lin.config'],
        rewrite(config: any) {
          return config?.i18n
        },
      },
      {
        files: ['.linrc'],
        rewrite(config: any) {
          return config?.i18n
        },
      },
      {
        files: 'package.json',
        extensions: [],
        rewrite(config: any) {
          return config?.lin?.i18n
        },
      },
      {
        files: ['vite.config', 'nuxt.config'],
        async rewrite(config) {
          const resolved = await (typeof config === 'function' ? config() : config)
          return resolved?.lin?.i18n
        },
      },
    ],
    cwd: options?.cwd || process.cwd(),
    merge: false,
    defaults: DEFAULT_I18N_CONFIG,

  })
  if (!config)
    handleCliError('No i18n configuration found', 'Please ensure you have a valid i18n configuration file (e.g., i18n.config.ts) or define i18n settings in your lin.config.ts or package.json.')

  return { i18n: config, sources }
}
