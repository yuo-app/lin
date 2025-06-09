import type { MockedFunction } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import c from 'picocolors'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import tidyCommand from '@/commands/tidy'
import * as configModule from '@/config'
import * as i18nConfigModule from '@/config/i18n'
import * as utilsModule from '@/utils'
import * as consoleModule from '@/utils/console'
import { baseArgsToRun, createVfsHelpers, mockI18nConfigResult, mockResolvedConfig } from '../test-helpers'

const actualNodePath = await vi.importActual<typeof path>('node:path')

vi.mock('node:fs')
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
    ICONS: {
      ...actual.ICONS,
    },
    formatLog: vi.fn(str => str),
  }
})
vi.mock('picocolors', () => {
  const colorsMock = {
    red: vi.fn(str => `red(${str})`),
    dim: vi.fn(str => `dim(${str})`),
    green: vi.fn(str => `green(${str})`),
    yellow: vi.fn(str => `yellow(${str})`),
    blue: vi.fn(str => `blue(${str})`),
    cyan: vi.fn(str => `cyan(${str})`),
    bold: vi.fn(str => `bold(${str})`),
    italic: vi.fn(str => `italic(${str})`),
    underline: vi.fn(str => `underline(${str})`),
  }
  return { default: colorsMock }
})

describe('tidy command', () => {
  let mockReadFileSync: MockedFunction<typeof fs.readFileSync>
  let mockWriteFileSync: MockedFunction<typeof fs.writeFileSync>
  let mockResolveConfig: MockedFunction<typeof configModule.resolveConfig>
  let mockLoadI18nConfig: MockedFunction<typeof i18nConfigModule.loadI18nConfig>
  let mockConsoleLog: MockedFunction<any>
  let mockConsoleLogL: MockedFunction<any>
  let mockPathDirname: MockedFunction<typeof path.dirname>
  let mockPathBasename: MockedFunction<typeof path.basename>
  let mockCountKeys: MockedFunction<typeof utilsModule.countKeys>
  let mockNormalizeLocales: MockedFunction<typeof utilsModule.normalizeLocales>
  let mockCheckArg: MockedFunction<typeof utilsModule.checkArg>
  let mockShapeMatches: MockedFunction<typeof utilsModule.shapeMatches>
  let mockFindMissingKeys: MockedFunction<typeof utilsModule.findMissingKeys>
  let mockSortKeys: MockedFunction<typeof utilsModule.sortKeys>
  let mockPicocolorsRed: MockedFunction<any>

  const { setupVirtualFile, expectVirtualFileContent, resetVfs, getVfs } = createVfsHelpers()

  const defaultEnJson = { a: 'Hello', b: 'World' }
  const defaultEsJson = { a: 'Hola', b: 'Mundo' }

  beforeEach(() => {
    vi.clearAllMocks()
    resetVfs()

    mockReadFileSync = fs.readFileSync as MockedFunction<typeof fs.readFileSync>
    mockWriteFileSync = fs.writeFileSync as MockedFunction<typeof fs.writeFileSync>
    mockResolveConfig = configModule.resolveConfig as MockedFunction<typeof configModule.resolveConfig>
    mockLoadI18nConfig = i18nConfigModule.loadI18nConfig as MockedFunction<typeof i18nConfigModule.loadI18nConfig>
    mockConsoleLog = consoleModule.console.log as MockedFunction<typeof consoleModule.console.log>
    mockConsoleLogL = consoleModule.console.logL as MockedFunction<typeof consoleModule.console.logL>
    mockPathDirname = vi.spyOn(path, 'dirname').mockReturnValue('mock/dir') as MockedFunction<typeof path.dirname>
    mockPathBasename = vi.spyOn(path, 'basename').mockReturnValue('mockfile.js') as MockedFunction<typeof path.basename>

    mockCountKeys = utilsModule.countKeys as MockedFunction<typeof utilsModule.countKeys>
    mockNormalizeLocales = utilsModule.normalizeLocales as MockedFunction<typeof utilsModule.normalizeLocales>
    mockCheckArg = utilsModule.checkArg as MockedFunction<typeof utilsModule.checkArg>
    mockShapeMatches = utilsModule.shapeMatches as MockedFunction<typeof utilsModule.shapeMatches>
    mockFindMissingKeys = utilsModule.findMissingKeys as MockedFunction<typeof utilsModule.findMissingKeys>
    mockSortKeys = utilsModule.sortKeys as MockedFunction<typeof utilsModule.sortKeys>
    mockPicocolorsRed = c.red as MockedFunction<any>

    mockResolveConfig.mockResolvedValue({ config: mockResolvedConfig, sources: ['lin.config.js'], dependencies: [] })
    mockLoadI18nConfig.mockResolvedValue(mockI18nConfigResult)
    mockPathDirname.mockReturnValue('mock/dir')
    mockPathBasename.mockReturnValue('mockfile.js')
    mockCountKeys.mockImplementation(obj => Object.keys(obj).length)

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
      setupVirtualFile(filePath.toString(), JSON.parse(data as string))
    })

    setupVirtualFile('locales/en-US.json', defaultEnJson)
    setupVirtualFile('locales/es-ES.json', defaultEsJson)
  })

  const runTidyCommand = (args: Record<string, any> = {}) => {
    const fullArgs = { ...baseArgsToRun, sort: undefined, locale: undefined, ...args }
    return tidyCommand.run?.({
      args: fullArgs as any,
      rawArgs: [],
      cmd: tidyCommand.meta as any,
    })
  }

  it('should log paths to config files if found', async () => {
    mockResolveConfig.mockResolvedValue({ config: mockResolvedConfig, sources: ['/path/to/lin.config.js'], dependencies: [] })
    mockLoadI18nConfig.mockResolvedValue({ ...mockI18nConfigResult, sources: ['/path/to/i18n.config.ts'] })
    mockPathDirname.mockImplementation(p => actualNodePath.dirname(p))
    mockPathBasename.mockImplementation(p => actualNodePath.basename(p))

    await runTidyCommand()

    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, expect.stringContaining('Lin config path: /path/to\\`lin.config.js`'))
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, expect.stringContaining('I18n config path: /path/to\\`i18n.config.ts`'))
  })

  it('should log errors if config files are not found', async () => {
    mockResolveConfig.mockResolvedValue({ config: mockResolvedConfig, sources: [], dependencies: [] })
    mockLoadI18nConfig.mockResolvedValue({ ...mockI18nConfigResult, sources: [] })

    await runTidyCommand()

    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.error, 'Lin config not found')
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.error, 'I18n config not found')
  })

  it('should log default locale key count', async () => {
    mockCountKeys.mockReturnValueOnce(5)
    await runTidyCommand()
    expect(mockCountKeys).toHaveBeenCalledWith(defaultEnJson)
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, 'Keys: `5`')
  })

  it('should log key counts for all locales and handle missing files', async () => {
    const frJson = { salut: 'Bonjour' }
    setupVirtualFile('locales/fr-FR.json', frJson)

    const tempI18nConfig = { ...mockI18nConfigResult.i18n, locales: ['en-US', 'es-ES', 'fr-FR', 'de-DE'] }
    mockLoadI18nConfig.mockResolvedValue({ i18n: tempI18nConfig, sources: ['i18n.config.js'] })

    mockCountKeys
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(2)
      .mockReturnValueOnce(1)

    await runTidyCommand()

    expect(mockConsoleLogL).toHaveBeenCalledWith(consoleModule.ICONS.note, 'Locales (`4`): ')
    expect(mockConsoleLogL).toHaveBeenCalledWith('**en-US** (`2`) ')
    expect(mockConsoleLogL).toHaveBeenCalledWith('**es-ES** (`2`) ')
    expect(mockConsoleLogL).toHaveBeenCalledWith('**fr-FR** (`1`) ')
    expect(mockPicocolorsRed).toHaveBeenCalledWith('**de-DE**')
    expect(mockConsoleLogL).toHaveBeenCalledWith('red(**de-DE**)', `(${consoleModule.ICONS.error}) `)
    expect(mockConsoleLog).toHaveBeenCalledTimes(4)
  })

  it('should not sort or write files if no sort argument is provided', async () => {
    await runTidyCommand()

    expect(mockCheckArg).toHaveBeenCalledWith(undefined, ['abc', 'def'])
    expect(mockWriteFileSync).not.toHaveBeenCalled()
    expect(mockConsoleLog).not.toHaveBeenCalledWith(consoleModule.ICONS.info, expect.stringContaining('Sorting locales'))
    expect(mockConsoleLog).not.toHaveBeenCalledWith(consoleModule.ICONS.success, expect.stringContaining('Sorted locales'))
  })

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

    await runTidyCommand({ sort: 'abc' })

    expect(mockCheckArg).toHaveBeenCalledWith('abc', ['abc', 'def'])
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.info, 'Sorting locales **alphabetically**')
    expect(mockSortKeys).toHaveBeenCalledTimes(2)
    expect(mockSortKeys).toHaveBeenCalledWith(sortedJson)

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2)
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('en-US.json'), JSON.stringify(sortedJson, null, 2), { encoding: 'utf8' })
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('es-ES.json'), JSON.stringify(sortedJson, null, 2), { encoding: 'utf8' })
    expectVirtualFileContent('locales/en-US.json', sortedJson)
    expectVirtualFileContent('locales/es-ES.json', sortedJson)
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Sorted locales: **en-US**, **es-ES**')
  })

  it('should sort by default locale when sort arg is "def"', async () => {
    const defaultOrderJson = { a: 'Default A', c: 'Default C', b: 'Default B' }
    const otherLocaleUnsorted = { b: 'Other B', a: 'Other A', c: 'Other C' }
    const otherLocaleSortedToDef = { a: 'Other A', c: 'Other C', b: 'Other B' }

    setupVirtualFile('locales/en-US.json', defaultOrderJson)
    setupVirtualFile('locales/es-ES.json', otherLocaleUnsorted)

    mockShapeMatches.mockReturnValue(true)
    mockSortKeys.mockImplementation((obj, refObj) => {
      if (!refObj) {
        const sorted: any = {}
        Object.keys(obj).sort().forEach(key => sorted[key] = obj[key])
        return sorted
      }
      const sortedWithRef: any = {}
      Object.keys(refObj).forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(obj, key))
          sortedWithRef[key] = obj[key]
      })
      Object.keys(obj).sort().forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(refObj, key))
          sortedWithRef[key] = obj[key]
      })
      return sortedWithRef
    })

    await runTidyCommand({ sort: 'def' })

    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.info, 'Sorting locales according to **default locale**')
    expect(mockSortKeys).toHaveBeenCalledTimes(2)
    expect(mockSortKeys).toHaveBeenCalledWith(defaultOrderJson, defaultOrderJson)
    expect(mockSortKeys).toHaveBeenCalledWith(otherLocaleUnsorted, defaultOrderJson)

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2)
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('en-US.json'), JSON.stringify(defaultOrderJson, null, 2), { encoding: 'utf8' })
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('es-ES.json'), JSON.stringify(otherLocaleSortedToDef, null, 2), { encoding: 'utf8' })
    expectVirtualFileContent('locales/en-US.json', defaultOrderJson)
    expectVirtualFileContent('locales/es-ES.json', otherLocaleSortedToDef)
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Sorted locales: **en-US**, **es-ES**')
  })

  it('should skip sorting and log warning if shape does not match for "abc" sort', async () => {
    const defaultJson = { a: 'A', b: 'B' }
    const mismatchJson = { a: 'A', c: 'C' }
    setupVirtualFile('locales/en-US.json', defaultJson)
    setupVirtualFile('locales/es-ES.json', mismatchJson)

    mockShapeMatches.mockImplementation((objA, objB) => JSON.stringify(Object.keys(objA).sort()) === JSON.stringify(Object.keys(objB).sort()))
    mockFindMissingKeys.mockReturnValue({ c: 'C' })

    await runTidyCommand({ sort: 'abc' })

    expect(mockShapeMatches).toHaveBeenCalledWith(defaultJson, mismatchJson)
    expect(mockConsoleLog).toHaveBeenCalledWith(
      consoleModule.ICONS.warning,
      'Locale **es-ES** is not up to date. Skipping...',
      expect.stringContaining('dim((found extra: c))'),
    )
    expect(mockFindMissingKeys).toHaveBeenCalled()
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('en-US.json'), expect.any(String), { encoding: 'utf8' })
    expect(mockWriteFileSync).not.toHaveBeenCalledWith(expect.stringContaining('es-ES.json'), expect.any(String), expect.any(Object))
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Sorted locales: **en-US**')
  })

  it('should skip sorting and log warning if shape does not match for "def" sort (missing key)', async () => {
    const defaultJson = { a: 'A', b: 'B', c: 'C' }
    const mismatchJson = { a: 'A', b: 'B' }
    setupVirtualFile('locales/en-US.json', defaultJson)
    setupVirtualFile('locales/es-ES.json', mismatchJson)

    mockShapeMatches.mockImplementation((objA, objB) => JSON.stringify(Object.keys(objA).sort()) === JSON.stringify(Object.keys(objB).sort()))
    mockFindMissingKeys.mockReturnValue({ c: 'some value' })

    await runTidyCommand({ sort: 'def' })

    expect(mockShapeMatches).toHaveBeenCalledWith(defaultJson, mismatchJson)
    expect(mockConsoleLog).toHaveBeenCalledWith(
      consoleModule.ICONS.warning,
      'Locale **es-ES** is not up to date. Skipping...',
      expect.stringContaining('dim((found missing: c))'),
    )
    expect(mockFindMissingKeys).toHaveBeenCalled()
    expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('en-US.json'), expect.any(String), { encoding: 'utf8' })
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Sorted locales: **en-US**')
  })

  it('should process only specified locale if args.locale is provided', async () => {
    const tempI18nConfig = { ...mockI18nConfigResult.i18n, locales: ['en-US', 'es-ES', 'fr-FR'] }
    mockLoadI18nConfig.mockResolvedValue({ i18n: tempI18nConfig, sources: ['i18n.config.js'] })
    setupVirtualFile('locales/fr-FR.json', { x: 'Ex', y: 'Why' })

    mockShapeMatches.mockReturnValue(true)
    mockSortKeys.mockImplementation((obj, _ref) => obj)

    await runTidyCommand({ sort: 'abc', locale: ['es'] })

    expect(mockNormalizeLocales).toHaveBeenCalledWith(['es'], tempI18nConfig)
    expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining('en-US.json'), { encoding: 'utf8' })
    expect(mockReadFileSync).toHaveBeenCalledWith(expect.stringContaining('es-ES.json'), { encoding: 'utf8' })
    expect(mockReadFileSync).not.toHaveBeenCalledWith(expect.stringContaining('fr-FR.json'), { encoding: 'utf8' })

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
    expect(mockWriteFileSync).toHaveBeenCalledWith(expect.stringContaining('es-ES.json'), expect.any(String), { encoding: 'utf8' })
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.success, 'Sorted locales: **es-ES**')
  })

  it('should call checkArg with invalid sort argument and proceed no further with sorting', async () => {
    await runTidyCommand({ sort: 'invalid-sort' })

    expect(mockCheckArg).toHaveBeenCalledWith('invalid-sort', ['abc', 'def'])
    expect(mockConsoleLog).not.toHaveBeenCalledWith(consoleModule.ICONS.info, expect.stringContaining('Sorting locales'))
    expect(mockWriteFileSync).not.toHaveBeenCalled()
    expect(mockConsoleLog).not.toHaveBeenCalledWith(consoleModule.ICONS.success, expect.stringContaining('Sorted locales:'))
  })

  it('should correctly use path.dirname and path.basename for config log', async () => {
    const linConfigPath = 'some/nested/path/lin.config.js'
    const i18nConfigPath = 'another/dir/i18n.config.ts'
    mockResolveConfig.mockResolvedValue({ config: mockResolvedConfig, sources: [linConfigPath], dependencies: [] })
    mockLoadI18nConfig.mockResolvedValue({ ...mockI18nConfigResult, sources: [i18nConfigPath] })

    mockPathDirname.mockImplementation(actualPath => actualNodePath.dirname(actualPath))
    mockPathBasename.mockImplementation(actualPath => actualNodePath.basename(actualPath))

    await runTidyCommand()

    expect(mockPathDirname).toHaveBeenCalledWith(linConfigPath)
    expect(mockPathBasename).toHaveBeenCalledWith(linConfigPath)
    expect(mockPathDirname).toHaveBeenCalledWith(i18nConfigPath)
    expect(mockPathBasename).toHaveBeenCalledWith(i18nConfigPath)

    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, 'Lin config path: some/nested/path\\`lin.config.js`')
    expect(mockConsoleLog).toHaveBeenCalledWith(consoleModule.ICONS.note, 'I18n config path: another/dir\\`i18n.config.ts`')
  })

  it('should handle single locale in localesToCheck', async () => {
    const tempI18nConfig = { ...mockI18nConfigResult.i18n, locales: ['en-US'] }
    mockLoadI18nConfig.mockResolvedValue({ i18n: tempI18nConfig, sources: ['i18n.config.js'] })
    mockCountKeys.mockReturnValue(2)

    await runTidyCommand()

    expect(mockConsoleLogL).toHaveBeenCalledWith(consoleModule.ICONS.note, 'Locale (`1`): ')
    expect(mockConsoleLogL).toHaveBeenCalledWith('**en-US** (`2`) ')
  })
})
