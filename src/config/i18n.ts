import type { Config, Integration } from '@/config'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { loadConfig, type LoadConfigSource } from 'unconfig'
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
  const allSources: (LoadConfigSource & { names?: Integration[] })[] = [
    // Next.js
    {
      names: ['nextjs'],
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
      names: ['nuxt'],
      files: ['nuxt.config'],
      async rewrite(config: any) {
        const resolved = await (typeof config === 'function' ? config() : config)
        if (resolved.i18n) {
          return {
            locales: resolved.i18n?.locales?.map((l: any) => l.code),
            defaultLocale: resolved.i18n?.defaultLocale,
            directory: resolved.i18n?.langDir || 'locales',
          }
        }
        return resolved?.lin?.i18n
      },
    },
    // Vue I18n
    {
      names: ['vue-i18n'],
      files: ['vue.config'],
      rewrite(config: any) {
        return {
          locales: Object.keys(config.pluginOptions?.i18n?.locales || {}),
          defaultLocale: config.pluginOptions?.i18n?.locale,
          directory: config.pluginOptions?.i18n?.localeDir || 'src/locales',
        }
      },
    },
    // i18next
    {
      names: ['i18next'],
      files: ['i18next-parser.config'],
      rewrite(config: any) {
        return {
          locales: config.locales,
          defaultLocale: config.defaultLocale,
          directory: config.output?.replace(/\/\$LOCALE.*$/, '') || 'public/locales',
        }
      },
    },
    // Angular
    {
      names: ['angular'],
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
    // Svelte
    {
      names: ['svelte'],
      files: ['svelte.config'],
      async rewrite(config: any) {
        const resolved = await (typeof config === 'function' ? config() : config)
        if (!resolved.i18n)
          return {}
        return {
          locales: resolved.i18n?.locales || [],
          defaultLocale: resolved.i18n?.defaultLocale || 'en',
          directory: resolved.i18n?.directory || 'src/lib/i18n',
        }
      },
    },
    // Ember
    {
      names: ['ember-intl'],
      files: ['ember-cli-build'],
      rewrite(config: any) {
        if (!config.intl)
          return {}
        return {
          locales: config.intl?.locales || [],
          defaultLocale: config.intl?.defaultLocale || 'en-us',
          directory: config.intl?.baseDir || 'translations',
        }
      },
    },
    // Gatsby
    {
      names: ['gatsby'],
      files: ['gatsby-config'],
      async rewrite(config: any) {
        const resolved = await (typeof config === 'function' ? config() : config)
        const i18nPlugin = resolved.plugins?.find((p: any) => p.resolve === 'gatsby-theme-i18n' || p.resolve === 'gatsby-plugin-i18n')
        if (i18nPlugin?.options) {
          const configPath = i18nPlugin.options.configPath
          let locales: string[] = []
          if (configPath) {
            try {
              const fullPath = path.resolve(options?.cwd || process.cwd(), configPath)
              const configContent = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
              locales = configContent.map((l: any) => l.code)
            }
            catch (error) {
              console.error(error)
            }
          }
          return {
            locales,
            defaultLocale: i18nPlugin.options.defaultLang || 'en',
            directory: 'i18n',
          }
        }
        return {}
      },
    },
    // Astro
    {
      names: ['astro'],
      files: ['astro.config'],
      async rewrite(config: any) {
        const resolved = await (typeof config === 'function' ? config() : config)
        if (resolved.i18n) {
          return {
            locales: resolved.i18n?.locales || [],
            defaultLocale: resolved.i18n?.defaultLocale || 'en',
            directory: resolved.i18n?.directory || 'public/locales',
          }
        }
        return resolved?.lin?.i18n
      },
    },
    // astro-i18next
    {
      names: ['astro-i18next'],
      files: ['astro-i18next.config'],
      rewrite(config: any) {
        return {
          locales: config.locales || [],
          defaultLocale: config.defaultLocale || 'en',
          directory: 'public/locales',
        }
      },
    },
    // Fallback i18n config files
    {
      files: ['i18n.config'],
    },
    {
      files: ['.1i8nrc'],
    },
    // Lin config files
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
    // package.json for lin, remix, qwik
    {
      names: ['remix', 'qwik', 'i18next'],
      files: 'package.json',
      extensions: [],
      rewrite(config: any) {
        if (config?.remix?.i18n || config?.qwik?.i18n) {
          return {
            locales: config.remix?.i18n?.locales || config.qwik?.i18n?.locales || [],
            defaultLocale: config.remix?.i18n?.defaultLocale || config.qwik?.i18n?.defaultLocale || 'en',
            directory: config.remix?.i18n?.directory || config.qwik?.i18n?.directory || 'app/locales',
          }
        }
        return config?.lin?.i18n
      },
    },
    // Lin config inside vite
    {
      names: ['solid', 'qwik'],
      files: ['vite.config'],
      async rewrite(config: any) {
        const resolved = await (typeof config === 'function' ? config() : config)
        if (resolved.i18n) {
          return {
            locales: resolved.i18n?.locales || [],
            defaultLocale: resolved.i18n?.defaultLocale || 'en',
            directory: resolved.i18n?.directory || 'i18n',
          }
        }
        return resolved?.lin?.i18n
      },
    },
  ]

  const integration = options?.integration
  let sourcesToSearch: LoadConfigSource[] = allSources

  if (integration) {
    sourcesToSearch = allSources.filter(source =>
      !source.names || source.names.includes(integration as Integration),
    )
  }

  const { config, sources } = await loadConfig<I18nConfig>({
    sources: sourcesToSearch.map(({ names, ...rest }: any) => rest),
    cwd: options?.cwd || process.cwd(),
    merge: false,
    defaults: DEFAULT_I18N_CONFIG,

  })
  if (!config)
    handleCliError('No i18n configuration found', 'Please ensure you have a valid i18n configuration file (e.g., i18n.config.ts) or define i18n settings in your lin.config.ts or package.json.')

  return { i18n: config, sources }
}
