import type { Mock, Mocked } from 'vitest'
import fs from 'node:fs'
import addCommand from '@/commands/add'
import { resolveConfig } from '@/config'
import { loadI18nConfig } from '@/config/i18n'
import * as consoleUtils from '@/utils/console'
import * as generalUtils from '@/utils/general'
import * as llmUtils from '@/utils/llm'
import { text as clackText } from '@clack/prompts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { baseArgsToRun, createVfsHelpers, mockI18nConfigResult, mockResolvedConfig } from '../test-helpers'

// Mocks
vi.mock('node:fs')
vi.mock('@/config', async () => {
  const actual = await vi.importActual('@/config')
  return {
    ...actual,
    resolveConfig: vi.fn(),
  }
})
vi.mock('@/config/i18n', async () => {
  const actual = await vi.importActual('@/config/i18n')
  return {
    ...actual,
    loadI18nConfig: vi.fn(),
  }
})
vi.mock('@clack/prompts', async () => {
  const actual = await vi.importActual('@clack/prompts')
  return {
    ...actual,
    text: vi.fn(),
  }
})

// Mock specific functions from utils to spy on them and control their behavior
const mockTranslateKeys = vi.spyOn(llmUtils, 'translateKeys')
const mockDeletionGuard = vi.spyOn(llmUtils, 'deletionGuard')
vi.spyOn(llmUtils, 'getWithLocales').mockImplementation((withLocale, i18n) => {
  // Basic mock for getWithLocales, can be expanded if needed for --with tests
  if (!withLocale || (Array.isArray(withLocale) && withLocale.length === 0))
    return { withLocales: [], includeContext: false }
  const locales = Array.isArray(withLocale) ? withLocale : [withLocale]
  const normalized = locales.filter(l => l).map(l => i18n.locales.find(il => il.startsWith(l)) || l) // Simplified normalization
  return { withLocales: normalized, includeContext: normalized.length > 0 }
})

const mockConsoleLog = vi.spyOn(consoleUtils.console, 'log')
vi.spyOn(consoleUtils.console, 'logL') // Just spy, no specific mock needed for now
const mockConsoleLoading = vi.spyOn(consoleUtils.console, 'loading').mockImplementation(async (_message, callback) => {
  await callback() // Ensure the callback within loading is executed
})
vi.spyOn(generalUtils, 'catchError').mockImplementation(fn => fn as any) // Pass through errors for functions wrapped by catchError

// VFS helpers
const { setupVirtualFile, getVirtualFileContent, resetVfs, expectVirtualFileContent } = createVfsHelpers()
const mockFs = fs as Mocked<typeof fs>

describe('add command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetVfs()

    // Default mock implementations
    ;(resolveConfig as Mock).mockResolvedValue({ config: mockResolvedConfig })
    ;(loadI18nConfig as Mock).mockResolvedValue(mockI18nConfigResult)
    ;(clackText as Mock).mockResolvedValue('Test Translation from Prompt')

    mockTranslateKeys.mockImplementation(async (keysToTranslate, _config, _i18n, _withLocaleJsons, _includeContext) => {
      const translated: Record<string, any> = {}
      for (const locale in keysToTranslate) {
        translated[locale] = {}
        for (const key in keysToTranslate[locale]) {
          const originalValue = (keysToTranslate[locale] as any)[key]
          translated[locale][key] = `${originalValue} (${locale})` // Predictable translation
        }
      }
      return translated
    })
    mockDeletionGuard.mockResolvedValue(true) // Assume user confirms deletion guard

    // Setup VFS mocks for fs
    mockFs.readFileSync.mockImplementation((path) => {
      const content = getVirtualFileContent(path.toString())
      if (content === undefined) {
        const e = new Error(`ENOENT: no such file or directory, open '${path.toString()}'`) as any
        e.code = 'ENOENT'
        throw e
      }
      return JSON.stringify(content)
    })
    mockFs.writeFileSync.mockImplementation((path, data) => {
      setupVirtualFile(path.toString(), JSON.parse(data.toString()))
    })
    mockFs.existsSync.mockImplementation((path: fs.PathLike) => getVirtualFileContent(path.toString()) !== undefined)

    // Setup default locale files for most tests
    setupVirtualFile('locales/en-US.json', { existing: { key: 'Hello' } })
    setupVirtualFile('locales/es-ES.json', { existing: { key: 'Hola' } })
  })

  afterEach(() => {
    resetVfs()
  })

  it('should add a new key with translation from prompt', async () => {
    const args = {
      ...baseArgsToRun,
      key: 'new.key',
      _: ['new.key'],
      locale: 'all',
    }

    await addCommand.run!({ args } as any)

    expect(clackText).toHaveBeenCalledWith({
      message: `Enter ${mockResolvedConfig.i18n.defaultLocale} translation for key new.key`,
      placeholder: 'Press [ENTER] to skip',
    })

    expect(mockTranslateKeys).toHaveBeenCalledWith(
      { 'es-ES': { 'new.key': 'Test Translation from Prompt' } },
      mockResolvedConfig,
      mockResolvedConfig.i18n,
      {},
      false,
    )

    expectVirtualFileContent('locales/en-US.json', {
      existing: { key: 'Hello' },
      new: { key: 'Test Translation from Prompt' },
    })
    expectVirtualFileContent('locales/es-ES.json', {
      existing: { key: 'Hola' },
      new: { key: 'Test Translation from Prompt (es-ES)' },
    })

    expect(mockDeletionGuard).toHaveBeenCalled()
    expect(mockConsoleLoading).toHaveBeenCalled()
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleUtils.ICONS.note, expect.stringContaining('Keys:'))
  })

  it('should add a new key with translation from CLI arguments', async () => {
    const cliTranslation = 'Test Translation from CLI'
    const args = {
      ...baseArgsToRun,
      key: 'another.key',
      _: ['another.key', cliTranslation],
      locale: 'all',
    }

    await addCommand.run!({ args } as any)

    expect(clackText).not.toHaveBeenCalled()

    expect(mockTranslateKeys).toHaveBeenCalledWith(
      { 'es-ES': { 'another.key': cliTranslation } },
      mockResolvedConfig,
      mockResolvedConfig.i18n,
      {},
      false,
    )

    expectVirtualFileContent('locales/en-US.json', {
      existing: { key: 'Hello' },
      another: { key: cliTranslation },
    })
    expectVirtualFileContent('locales/es-ES.json', {
      existing: { key: 'Hola' },
      another: { key: `${cliTranslation} (es-ES)` },
    })
    expect(mockDeletionGuard).toHaveBeenCalled()
  })

  it('should create a new locale file if it does not exist and add the key', async () => {
    const translation = 'New File Translation'
    const args = {
      ...baseArgsToRun,
      key: 'new.key.for.new.file',
      _: ['new.key.for.new.file', translation],
      locale: 'all', // Targets 'en-US', 'es-ES' from mock config
    }

    // Reset VFS and only set up one file to test creation of the other
    resetVfs()
    setupVirtualFile('locales/en-US.json', { existing: { key: 'Hello' } })
    // es-ES.json is intentionally not created

    await addCommand.run!({ args } as any)

    expect(mockConsoleLog).toHaveBeenCalledWith(consoleUtils.ICONS.warning, `File not found for locale **es-ES**. Creating a new one.`)

    expectVirtualFileContent('locales/en-US.json', {
      existing: { key: 'Hello' },
      new: { key: { for: { new: { file: translation } } } },
    })
    expectVirtualFileContent('locales/es-ES.json', {
      new: { key: { for: { new: { file: `${translation} (es-ES)` } } } },
    })
    expect(mockDeletionGuard).toHaveBeenCalled()
  })
})
