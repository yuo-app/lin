import process from 'node:process'
import { loadConfig } from 'unconfig'
import { beforeEach, describe, expect, it, type MockedFunction, vi } from 'vitest'
import { DEFAULT_CONFIG, defineConfig, resolveConfig } from '../../src/config'
import { DEFAULT_I18N_CONFIG } from '../../src/config/i18n'

vi.mock('unconfig')
const mockedLoadConfig = loadConfig as MockedFunction<typeof loadConfig>

describe('resolveConfig', () => {
  beforeEach(() => {
    mockedLoadConfig.mockImplementation(
      (options: any) =>
        Promise.resolve({
          config: options.defaults || {},
          sources: [],
          dependencies: [],
        }) as any,
    )
  })

  it('should return default config when no args are provided', async () => {
    const { config } = await resolveConfig({})
    expect(config.cwd).toBe(process.cwd())
    expect(config.debug).toBe(DEFAULT_CONFIG.debug)
    expect(config.locale).toBe(DEFAULT_CONFIG.locale)
    expect(config.context).toBe(DEFAULT_CONFIG.context)
    expect(config.i18n.locales).toEqual(DEFAULT_I18N_CONFIG.locales)
    expect(config.i18n.defaultLocale).toEqual(DEFAULT_I18N_CONFIG.defaultLocale)
    expect(config.i18n.directory).toEqual(DEFAULT_I18N_CONFIG.directory)
    expect(config.options.provider).toBe(DEFAULT_CONFIG.options.provider)
    expect(config.options.model).toBe(DEFAULT_CONFIG.options.model)
    expect(config.options.temperature).toBe(DEFAULT_CONFIG.options.temperature)
  })

  it('should override default config with provided args', async () => {
    const { config } = await resolveConfig(defineConfig({
      i18n: {
        locales: ['hu-HU', 'fr-FR'],
        defaultLocale: 'hu-HU',
        directory: 'locales',
      },
      context: 'Test context',
      options: {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-latest',
        temperature: 0.5,
      },
      cwd: '/test/cwd',
    }))
    expect(config.locale).toBe(DEFAULT_CONFIG.locale)
    expect(config.i18n.locales).toEqual(['hu-HU', 'fr-FR'])
    expect(config.i18n.defaultLocale).toEqual('hu-HU')
    expect(config.i18n.directory).toEqual('locales')
    expect(config.context).toBe('Test context')
    expect(config.options.provider).toBe('anthropic')
    expect(config.options.model).toBe('claude-3-5-sonnet-latest')
    expect(config.options.temperature).toBe(0.5)
    expect(config.cwd).toBe('/test/cwd')
  })

  it('should override default config with provided args, including Azure options', async () => {
    const { config } = await resolveConfig(defineConfig({
      i18n: {
        locales: ['hu-HU', 'fr-FR'],
        defaultLocale: 'hu-HU',
        directory: 'locales',
      },
      context: 'Test context',
      options: {
        provider: 'azure',
        model: 'my-azure-deployment',
        temperature: 0.5,
        apiKey: 'test-azure-key',
        resourceName: 'my-resource',
        baseURL: 'https://custom.azure.com',
        apiVersion: '2025-05-01',
      },
      cwd: '/test/cwd',
    }))
    expect(config.locale).toBe(DEFAULT_CONFIG.locale)
    expect(config.i18n.locales).toEqual(['hu-HU', 'fr-FR'])
    expect(config.i18n.defaultLocale).toEqual('hu-HU')
    expect(config.i18n.directory).toEqual('locales')
    expect(config.context).toBe('Test context')
    expect(config.options.provider).toBe('azure')
    expect(config.options.model).toBe('my-azure-deployment')
    expect(config.options.temperature).toBe(0.5)
    expect(config.options.apiKey).toBe('test-azure-key')
    if (config.options.provider === 'azure') {
      expect(config.options.resourceName).toBe('my-resource')
      expect(config.options.baseURL).toBe('https://custom.azure.com')
      expect(config.options.apiVersion).toBe('2025-05-01')
    }
    expect(config.cwd).toBe('/test/cwd')
  })

  it('should handle invalid provider arg', async () => {
    const args = { provider: 'invalid-provider' }
    await expect(resolveConfig(args)).rejects.toThrowError()
  })

  it('should handle invalid model for a valid provider', async () => {
    const args = { provider: 'openai', model: 'invalid-model-for-openai' }
    await expect(resolveConfig(args)).rejects.toThrowError()
  })

  it('should handle invalid temperature arg', async () => {
    const args = { temperature: 'not-a-number' }
    await expect(resolveConfig(args)).rejects.toThrowError()
  })
})
