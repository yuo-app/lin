import type { Mock } from 'vitest'
import { loadConfig } from 'unconfig'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_I18N_CONFIG, loadI18nConfig } from '@/config/i18n'
import { handleCliError } from '@/utils'

vi.mock('unconfig')
vi.mock('@/utils')

const mockedLoadConfig = loadConfig as unknown as Mock
const mockedHandleCliError = handleCliError as unknown as Mock

describe('loadI18nConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedHandleCliError.mockImplementation(() => {
      throw new Error('handleCliError called')
    })
    mockedLoadConfig.mockResolvedValue({
      config: DEFAULT_I18N_CONFIG,
      sources: [],
    })
  })

  it('should load config from next.config.js', async () => {
    const nextConfigContent = {
      i18n: {
        locales: ['en', 'fr'],
        defaultLocale: 'en',
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('next.config'))
      const rewrittenConfig = await source.rewrite(nextConfigContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['next.config.js'] }
    })

    const { i18n } = await loadI18nConfig()

    expect(i18n.locales).toEqual(['en', 'fr'])
    expect(i18n.defaultLocale).toBe('en')
    expect(i18n.directory).toBe('public/locales')
  })

  it('should load config from nuxt.config.js', async () => {
    const nuxtConfigContent = {
      i18n: {
        langDir: 'i18n/',
        locales: [
          { code: 'en', name: 'English' },
          { code: 'es', name: 'Español' },
        ],
        defaultLocale: 'en',
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('nuxt.config'))
      const rewrittenConfig = await source.rewrite(nuxtConfigContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['nuxt.config.js'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['en', 'es'])
    expect(i18n.defaultLocale).toBe('en')
    expect(i18n.directory).toBe('i18n/')
  })

  it('should load config from vue.config.js with localeDir', async () => {
    const vueConfigContent = {
      pluginOptions: {
        i18n: {
          locale: 'de',
          fallbackLocale: 'de',
          localeDir: 'translations',
          locales: { de: 'Deutsch', at: 'Österreichisch' },
        },
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('vue.config'))
      const rewrittenConfig = await source.rewrite(vueConfigContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['vue.config.js'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['de', 'at'])
    expect(i18n.defaultLocale).toBe('de')
    expect(i18n.directory).toBe('translations')
  })

  it('should load config from vue.config.js without localeDir', async () => {
    const vueConfigContent = {
      pluginOptions: {
        i18n: {
          locale: 'jp',
          locales: { jp: 'Japanese', kr: 'Korean' },
        },
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('vue.config'))
      const rewrittenConfig = await source.rewrite(vueConfigContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['vue.config.js'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['jp', 'kr'])
    expect(i18n.defaultLocale).toBe('jp')
    expect(i18n.directory).toBe('src/locales')
  })

  it('should load config from i18next-parser.config.js with patterned output', async () => {
    const i18nextParserConfig = {
      locales: ['en-GB', 'en-US'],
      output: 'src/assets/locales/$LOCALE/translation.json',
      defaultLocale: 'en-GB',
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('i18next-parser.config'))
      const rewrittenConfig = await source.rewrite(i18nextParserConfig)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['i18next-parser.config.js'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['en-GB', 'en-US'])
    expect(i18n.defaultLocale).toBe('en-GB')
    expect(i18n.directory).toBe('src/assets/locales')
  })

  it('should load config from angular.json', async () => {
    const angularConfig = {
      defaultProject: 'my-app',
      projects: {
        'my-app': {
          i18n: {
            sourceLocale: 'en-US',
            locales: {
              fr: 'src/locale/messages.fr.xlf',
              de: 'src/locale/messages.de.xlf',
            },
          },
        },
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files === 'angular.json')
      const rewrittenConfig = await source.rewrite(angularConfig)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['angular.json'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['fr', 'de'])
    expect(i18n.defaultLocale).toBe('en-US')
    expect(i18n.directory).toBe('src/locale')
  })

  it('should handle no config being found by throwing an error', async () => {
    mockedLoadConfig.mockResolvedValue({ config: null, sources: [] })
    await expect(loadI18nConfig()).rejects.toThrow('handleCliError called')
    expect(mockedHandleCliError).toHaveBeenCalledWith('No i18n configuration found', expect.any(String))
  })

  it('should load config from lin.config file', async () => {
    const linConfigContent = {
      i18n: {
        locales: ['en-AU', 'en-NZ'],
        defaultLocale: 'en-AU',
        directory: 'translations/lin',
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('lin.config'))
      const rewrittenConfig = await source.rewrite(linConfigContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['lin.config.js'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['en-AU', 'en-NZ'])
    expect(i18n.defaultLocale).toBe('en-AU')
    expect(i18n.directory).toBe('translations/lin')
  })

  it('should load config from .linrc file', async () => {
    const linrcContent = {
      i18n: {
        locales: ['ja-JP'],
        defaultLocale: 'ja-JP',
        directory: 'lang',
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('.linrc'))
      const rewrittenConfig = await source.rewrite(linrcContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['.linrc'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['ja-JP'])
    expect(i18n.defaultLocale).toBe('ja-JP')
    expect(i18n.directory).toBe('lang')
  })

  it('should load config from package.json', async () => {
    const packageJsonContent = {
      name: 'my-package',
      version: '1.0.0',
      lin: {
        i18n: {
          locales: ['ko-KR', 'zh-CN'],
          defaultLocale: 'ko-KR',
          directory: 'i18n-files',
        },
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files === 'package.json')
      const rewrittenConfig = await source.rewrite(packageJsonContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['package.json'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['ko-KR', 'zh-CN'])
    expect(i18n.defaultLocale).toBe('ko-KR')
    expect(i18n.directory).toBe('i18n-files')
  })

  it('should load config from vite.config.js', async () => {
    const viteConfigContent = {
      plugins: [],
      lin: {
        i18n: {
          locales: ['sv-SE', 'nb-NO'],
          defaultLocale: 'sv-SE',
          directory: 'international',
        },
      },
    }
    mockedLoadConfig.mockImplementation(async (options) => {
      const source = options.sources.find((s: any) => s.files.includes('vite.config'))
      const rewrittenConfig = await source.rewrite(viteConfigContent)
      return { config: { ...DEFAULT_I18N_CONFIG, ...rewrittenConfig }, sources: ['vite.config.js'] }
    })

    const { i18n } = await loadI18nConfig()
    expect(i18n.locales).toEqual(['sv-SE', 'nb-NO'])
    expect(i18n.defaultLocale).toBe('sv-SE')
    expect(i18n.directory).toBe('international')
  })
})
