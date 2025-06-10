import type { MockedFunction } from 'vitest'
import fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import editCommand from '@/commands/edit'
import * as configModule from '@/config'
import * as i18nConfigModule from '@/config/i18n'
import * as consoleModule from '@/utils/console'
import { baseArgsToRun, createVfsHelpers, mockI18nConfigResult, mockResolvedConfig } from '../test-helpers'

vi.mock('node:fs')
vi.mock('@/config')
vi.mock('@/config/i18n')
vi.mock('@/utils/console', async () => {
  const actual = await vi.importActual('@/utils/console')
  return {
    ...actual,
    console: {
      log: vi.fn(),
      logL: vi.fn(),
      loading: vi.fn((_message: string, callback: () => Promise<any>) => callback()),
    },
    ICONS: {
      success: '✓',
      info: 'ℹ',
    },
    formatLog: vi.fn(str => str),
  }
})

describe('edit command', () => {
  let mockReadFileSync: MockedFunction<typeof fs.readFileSync>
  let mockWriteFileSync: MockedFunction<typeof fs.writeFileSync>
  let mockResolveConfig: MockedFunction<typeof configModule.resolveConfig>
  let mockLoadI18nConfig: MockedFunction<typeof i18nConfigModule.loadI18nConfig>
  let mockConsoleLog: MockedFunction<any>

  const { setupVirtualFile, getVirtualFileContent, expectVirtualFileContent, resetVfs } = createVfsHelpers()

  beforeEach(() => {
    vi.clearAllMocks()
    resetVfs()

    mockReadFileSync = fs.readFileSync as MockedFunction<typeof fs.readFileSync>
    mockWriteFileSync = fs.writeFileSync as MockedFunction<typeof fs.writeFileSync>
    mockResolveConfig = configModule.resolveConfig as MockedFunction<typeof configModule.resolveConfig>
    mockLoadI18nConfig = i18nConfigModule.loadI18nConfig as MockedFunction<typeof i18nConfigModule.loadI18nConfig>
    mockConsoleLog = consoleModule.console.log as MockedFunction<typeof consoleModule.console.log>

    mockResolveConfig.mockResolvedValue({ config: mockResolvedConfig, sources: ['lin.config.js'], dependencies: [] })
    mockLoadI18nConfig.mockResolvedValue(mockI18nConfigResult)

    mockReadFileSync.mockImplementation((path) => {
      const fileContent = getVirtualFileContent(path.toString())
      if (fileContent !== undefined)
        return JSON.stringify(fileContent, null, 2)

      const error = new Error(`ENOENT: no such file or directory, open '${path.toString()}'`)
      // @ts-expect-error - code is a property of NodeJS.ErrnoException
      error.code = 'ENOENT'
      throw error
    })

    mockWriteFileSync.mockImplementation((path, data) => {
      try {
        const jsonData = JSON.parse(data as string)
        setupVirtualFile(path.toString(), jsonData)
      }
      catch (e) {
        console.error('Data written by command was not valid JSON:', data, e)
        throw new Error('Test setup error: Data written by command to VFS was not valid JSON string for setupVirtualFile')
      }
    })
  })

  it('should edit a single top-level key from all configured locales', async () => {
    setupVirtualFile('locales/en-US.json', { greeting: 'Hello', farewell: 'Goodbye' })
    setupVirtualFile('locales/es-ES.json', { greeting: 'Hola', farewell: 'Adiós' })

    const argsToRun = {
      ...baseArgsToRun,
      _: ['greeting', 'Hi there'],
      key: 'greeting',
      value: 'Hi there',
      locale: undefined,
    }

    await editCommand.run?.({
      args: argsToRun as any,
      rawArgs: ['greeting', 'Hi there'],
      cmd: editCommand.meta as any,
    })

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2)
    expectVirtualFileContent('locales/en-US.json', { greeting: 'Hi there', farewell: 'Goodbye' })
    expectVirtualFileContent('locales/es-ES.json', { greeting: 'Hi there', farewell: 'Adiós' })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      consoleModule.ICONS.success,
      'Edited key `greeting` in **en-US**, **es-ES**',
    )
  })

  it('should skip and log when a key is not found in one locale but edit in another', async () => {
    setupVirtualFile('locales/en-US.json', { onlyKey: 'Hello' })
    setupVirtualFile('locales/es-ES.json', { keyToEdit: 'Hola', anotherKey: 'Adiós' })

    const argsToRun = {
      ...baseArgsToRun,
      _: ['keyToEdit', 'New Value'],
      key: 'keyToEdit',
      value: 'New Value',
      locale: undefined,
    }

    await editCommand.run?.({
      args: argsToRun as any,
      rawArgs: ['keyToEdit', 'New Value'],
      cmd: editCommand.meta as any,
    })

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
    expectVirtualFileContent('locales/en-US.json', { onlyKey: 'Hello' })
    expectVirtualFileContent('locales/es-ES.json', { keyToEdit: 'New Value', anotherKey: 'Adiós' })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      consoleModule.ICONS.info,
      'Skipped: **en-US** *(key `keyToEdit` not found)*',
    )
    expect(mockConsoleLog).toHaveBeenCalledWith(
      consoleModule.ICONS.success,
      'Edited key `keyToEdit` in **es-ES**',
    )
  })

  it('should edit a key from a specific locale when specified with -l', async () => {
    setupVirtualFile('locales/en-US.json', { greeting: 'Hello', farewell: 'Goodbye' })
    setupVirtualFile('locales/es-ES.json', { greeting: 'Hola', farewell: 'Adiós' })

    const argsToRun = {
      ...baseArgsToRun,
      _: ['greeting', 'Hi from en-US'],
      key: 'greeting',
      value: 'Hi from en-US',
      locale: ['en-US'],
    }

    await editCommand.run?.({
      args: argsToRun as any,
      rawArgs: ['greeting', 'Hi from en-US', '-l', 'en-US'],
      cmd: editCommand.meta as any,
    })

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
    expectVirtualFileContent('locales/en-US.json', { greeting: 'Hi from en-US', farewell: 'Goodbye' })
    expectVirtualFileContent('locales/es-ES.json', { greeting: 'Hola', farewell: 'Adiós' })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      consoleModule.ICONS.success,
      'Edited key `greeting` in **en-US**',
    )
  })

  it('should edit a nested key', async () => {
    setupVirtualFile('locales/en-US.json', { ui: { button: { save: 'Save' } } })
    setupVirtualFile('locales/es-ES.json', { ui: { button: { save: 'Guardar' } } })

    const argsToRun = {
      ...baseArgsToRun,
      _: ['ui.button.save', 'Save Changes'],
      key: 'ui.button.save',
      value: 'Save Changes',
      locale: undefined,
    }

    await editCommand.run?.({
      args: argsToRun as any,
      rawArgs: ['ui.button.save', 'Save Changes'],
      cmd: editCommand.meta as any,
    })

    expect(mockWriteFileSync).toHaveBeenCalledTimes(2)
    expectVirtualFileContent('locales/en-US.json', { ui: { button: { save: 'Save Changes' } } })
    expectVirtualFileContent('locales/es-ES.json', { ui: { button: { save: 'Save Changes' } } })

    expect(mockConsoleLog).toHaveBeenCalledWith(
      consoleModule.ICONS.success,
      'Edited key `ui.button.save` in **en-US**, **es-ES**',
    )
  })

  it('should handle values with spaces correctly', async () => {
    setupVirtualFile('locales/en-US.json', { welcome: 'Welcome' })
    const newValue = 'Welcome to our application'

    const argsToRun = {
      ...baseArgsToRun,
      _: ['welcome', ...newValue.split(' ')],
      key: 'welcome',
      value: newValue,
      locale: ['en-US'],
    }

    await editCommand.run?.({
      args: argsToRun as any,
      rawArgs: ['welcome', newValue, '-l', 'en-US'],
      cmd: editCommand.meta as any,
    })

    expectVirtualFileContent('locales/en-US.json', { welcome: newValue })
  })
})
