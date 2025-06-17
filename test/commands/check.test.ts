import type { MockedFunction } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import c from 'picocolors'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import checkCommand from '@/commands/check'
import * as configModule from '@/config'
import * as i18nConfigModule from '@/config/i18n'
import * as utilsModule from '@/utils'
import * as consoleModule from '@/utils/console'
import { baseArgsToRun, createVfsHelpers, mockI18nConfigResult, mockResolvedConfig } from '../test-helpers'

const actualNodePath = await vi.importActual<typeof path>('node:path')
const actualUtils = await vi.importActual<typeof utilsModule>('@/utils')

vi.mock('node:fs')
vi.mock('node:process', async (importOriginal) => {
  const mod = await importOriginal<typeof import('node:process')>()
  return {
    default: {
      ...mod,
      exitCode: 0,
    },
  }
})
vi.mock('@/config')
vi.mock('@/config/i18n')
vi.mock('@/utils', async () => {
  const actual = await vi.importActual('@/utils') as typeof utilsModule
  return {
    ...actual,
    countKeys: vi.fn(),
    shapeMatches: vi.fn(),
    findMissingKeys: vi.fn(),
    sortKeys: vi.fn(),
    mergeMissingTranslations: vi.fn(),
    catchError: vi.fn((fn: any) => fn),
    checkArg: vi.fn(),
    normalizeLocales: vi.fn((locales, i18n) => actual.normalizeLocales(locales, i18n)),
  }
})
vi.mock('@/utils/console', async () => {
  const actual = await vi.importActual('@/utils/console') as typeof consoleModule
  return {
    ...actual,
    console: {
      log: vi.fn(),
      logL: vi.fn(),
      loading: vi.fn((_message: string, callback: () => Promise<any>) => callback()),
    },
    ICONS: actual.ICONS,
  }
})
vi.mock('picocolors', () => ({
  default: {
    red: vi.fn(str => `red(${str})`),
    dim: vi.fn(str => `dim(${str})`),
    cyan: vi.fn(str => `cyan(${str})`),
    bold: vi.fn(str => `bold(${str})`),
    green: vi.fn(str => `green(${str})`),
    yellow: vi.fn(str => `yellow(${str})`),
    blue: vi.fn(str => `blue(${str})`),
    italic: vi.fn(str => `italic(${str})`),
    underline: vi.fn(str => `underline(${str})`),
  },
}))

describe('check command', () => {
  let mockReadFileSync: MockedFunction<typeof fs.readFileSync>
  let mockWriteFileSync: MockedFunction<typeof fs.writeFileSync>
  let mockExistsSync: MockedFunction<typeof fs.existsSync>
  let mockResolveConfig: MockedFunction<typeof configModule.resolveConfig>
  let mockLoadI18nConfig: MockedFunction<typeof i18nConfigModule.loadI18nConfig>
  let mockConsoleLog: MockedFunction<any>
  let mockPathDirname: MockedFunction<typeof path.dirname>
  let mockPathBasename: MockedFunction<typeof path.basename>
  let mockCountKeys: MockedFunction<typeof utilsModule.countKeys>
  let mockShapeMatches: MockedFunction<typeof utilsModule.shapeMatches>
  let mockFindMissingKeys: MockedFunction<typeof utilsModule.findMissingKeys>
  let mockSortKeys: MockedFunction<typeof utilsModule.sortKeys>
  let mockMergeMissingTranslations: MockedFunction<typeof utilsModule.mergeMissingTranslations>

  const { setupVirtualFile, resetVfs, getVfs } = createVfsHelpers()

  const defaultEnJson = { a: 'Hello', b: 'World', c: { d: 'Nested' } }
  const completeEsJson = { a: 'Hola', b: 'Mundo', c: { d: 'Anidado' } }
  const incompleteEsJson = { a: 'Hola' }

  beforeEach(() => {
    vi.clearAllMocks()
    resetVfs()
    process.exitCode = 0

    mockReadFileSync = fs.readFileSync as MockedFunction<typeof fs.readFileSync>
    mockWriteFileSync = fs.writeFileSync as MockedFunction<typeof fs.writeFileSync>
    mockExistsSync = fs.existsSync as MockedFunction<typeof fs.existsSync>
    mockResolveConfig = configModule.resolveConfig as MockedFunction<typeof configModule.resolveConfig>
    mockLoadI18nConfig = i18nConfigModule.loadI18nConfig as MockedFunction<typeof i18nConfigModule.loadI18nConfig>
    mockConsoleLog = vi.spyOn(consoleModule.console, 'log') as MockedFunction<any>
    vi.spyOn(consoleModule.console, 'logL')
    mockPathDirname = vi.spyOn(path, 'dirname') as MockedFunction<typeof path.dirname>
    mockPathBasename = vi.spyOn(path, 'basename') as MockedFunction<typeof path.basename>

    mockCountKeys = utilsModule.countKeys as MockedFunction<typeof utilsModule.countKeys>
    mockShapeMatches = utilsModule.shapeMatches as MockedFunction<typeof utilsModule.shapeMatches>
    mockFindMissingKeys = utilsModule.findMissingKeys as MockedFunction<typeof utilsModule.findMissingKeys>
    mockSortKeys = utilsModule.sortKeys as MockedFunction<typeof utilsModule.sortKeys>
    mockMergeMissingTranslations = utilsModule.mergeMissingTranslations as MockedFunction<typeof utilsModule.mergeMissingTranslations>

    mockShapeMatches.mockReturnValue(true)
    mockFindMissingKeys.mockReturnValue({})

    mockResolveConfig.mockResolvedValue({ config: mockResolvedConfig, sources: ['lin.config.js'], dependencies: [] })
    mockLoadI18nConfig.mockResolvedValue(mockI18nConfigResult)
    mockCountKeys.mockImplementation(obj => actualUtils.countKeys(obj))

    mockReadFileSync.mockImplementation((filePath) => {
      const fsMap = getVfs()
      const normalizedPath = filePath.toString().replace(/\\/g, '/')
      const rawFileContent = fsMap[normalizedPath]
      if (rawFileContent === undefined) {
        const error = new Error(`ENOENT: no such file or directory, open '${filePath.toString()}'`)
        // @ts-expect-error - code is a property of NodeJS.ErrnoException
        error.code = 'ENOENT'
        throw error
      }
      return rawFileContent
    })
    mockWriteFileSync.mockImplementation((filePath, data) => {
      setupVirtualFile(filePath.toString(), JSON.parse(data.toString()))
    })
    mockExistsSync.mockImplementation((path) => {
      return getVfs()[path.toString().replace(/\\/g, '/')] !== undefined
    })

    setupVirtualFile('locales/en-US.json', defaultEnJson)
    setupVirtualFile('locales/es-ES.json', completeEsJson)
  })

  const runCheckCommand = (args: Record<string, any> = {}) => {
    const fullArgs = { ...baseArgsToRun, sort: undefined, locale: undefined, fix: false, info: false, ...args }
    return checkCommand.run?.({
      args: fullArgs as any,
      rawArgs: [],
      cmd: checkCommand.meta as any,
    })
  }

  describe('info flag', () => {
    it('should show info when --info flag is passed', async () => {
      mockResolveConfig.mockResolvedValue({ config: mockResolvedConfig, sources: ['/path/to/lin.config.js'], dependencies: [] })
      mockLoadI18nConfig.mockResolvedValue({ ...mockI18nConfigResult, sources: ['/path/to/i18n.config.ts'] })
      mockPathDirname.mockImplementation(p => actualNodePath.dirname(p))
      mockPathBasename.mockImplementation(p => actualNodePath.basename(p))

      await runCheckCommand({ info: true })

      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, expect.stringContaining('Lin config path: /path/to\\`lin.config.js`'))
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, expect.stringContaining('I18n config path: /path/to\\`i18n.config.ts`'))
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, expect.stringContaining('Keys: `4`'))
    })

    it('should not show info by default', async () => {
      await runCheckCommand()
      expect(mockConsoleLog).not.toHaveBeenCalledWith(consoleModule.ICONS.note, expect.stringContaining('Lin config path'))
      expect(mockConsoleLog).not.toHaveBeenCalledWith(consoleModule.ICONS.note, expect.stringContaining('I18n config path'))
    })
  })

  describe('validation', () => {
    it('should log success if all locales are up to date', async () => {
      mockFindMissingKeys.mockReturnValue({})
      await runCheckCommand()
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'All locales are up to date.')
    })

    it('should report missing keys and set exit code to 1', async () => {
      setupVirtualFile('locales/es-ES.json', incompleteEsJson)
      mockFindMissingKeys.mockReturnValue({ 'b': 'World', 'c.d': 'Nested' })

      await runCheckCommand()

      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.warning, 'Locale **es-ES** is missing `2` keys')
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, 'Samples: `b`, `c.d`')
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.error, 'Missing keys detected. Run with --fix to add empty keys.')
      expect(process.exitCode).toBe(1)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })
  })

  describe('fix flag', () => {
    it('should add missing keys with empty strings when --fix is used', async () => {
      setupVirtualFile('locales/es-ES.json', incompleteEsJson)
      mockFindMissingKeys.mockReturnValue({ 'b': 'World', 'c.d': 'Nested' })
      mockMergeMissingTranslations.mockImplementation(actualUtils.mergeMissingTranslations)

      await runCheckCommand({ fix: true })

      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.info, 'Adding missing keys with empty values...')
      const expectedJson = { a: 'Hola', b: '', c: { d: '' } }
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        expect.stringContaining('es-ES.json'),
        `${JSON.stringify(expectedJson, null, 2)}\n`,
        { encoding: 'utf8' },
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Missing keys added successfully.')
      expect(process.exitCode).toBe(0)
    })
  })

  describe('sorting', () => {
    it('should sort alphabetically when sort arg is "abc"', async () => {
      const unsortedJson = { b: 'World', a: 'Hello' }
      const sortedJson = { a: 'Hello', b: 'World' }
      setupVirtualFile('locales/en-US.json', unsortedJson)
      setupVirtualFile('locales/es-ES.json', unsortedJson)
      mockShapeMatches.mockReturnValue(true)
      mockSortKeys.mockImplementation((obj, _ref) => {
        const sorted: any = {}
        Object.keys(obj).sort().forEach(key => sorted[key] = obj[key])
        return sorted
      })

      await runCheckCommand({ sort: 'abc' })

      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.info, 'Sorting locales **alphabetically**')
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2)
      expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('en-US.json'), `${JSON.stringify(sortedJson, null, 2)}\n`, { encoding: 'utf8' })
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Sorted locales: **en-US**, **es-ES**')
    })

    it('should skip sorting for locales that are not up to date', async () => {
      setupVirtualFile('locales/es-ES.json', incompleteEsJson)
      mockShapeMatches.mockReturnValueOnce(true).mockReturnValueOnce(false)
      mockFindMissingKeys.mockReturnValue({ 'b': 'World', 'c.d': 'Nested' })
      mockSortKeys.mockImplementation((obj, _ref) => obj)

      await runCheckCommand({ sort: 'abc' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        consoleModule.ICONS.warning,
        expect.stringContaining('Locale **es-ES** is not up to date. Skipping...'),
        expect.anything(),
      )
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1) // only en-US
      expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Sorted locales: **en-US**')
    })
  })
})
