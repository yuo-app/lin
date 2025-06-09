import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { console, ICONS } from '@/utils/console'
import * as generalUtils from '@/utils/general'

const actualHandleCliErrorImplementation = generalUtils.handleCliError
const spiedHandleCliError = vi.spyOn(generalUtils, 'handleCliError')

const processExitMock = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
const consoleLogSpy = vi.spyOn(console, 'log')

describe('handleCliError', () => {
  beforeEach(() => {
    processExitMock.mockClear()
    consoleLogSpy.mockClear()
    spiedHandleCliError.mockClear()
    spiedHandleCliError.mockImplementation(actualHandleCliErrorImplementation)
  })

  afterEach(() => {
  })

  it('should log error and exit with code 1', () => {
    const errorMessage = 'Test error message'
    try {
      generalUtils.handleCliError(errorMessage)
    }
    catch {}

    expect(consoleLogSpy).toHaveBeenCalledWith(ICONS.error, errorMessage)
    expect(processExitMock).toHaveBeenCalledWith(1)
    expect(spiedHandleCliError).toHaveBeenCalledWith(errorMessage)
  })

  it('should log error with a single detail and exit', () => {
    const errorMessage = 'Test error message'
    const detail = 'Error detail'
    try {
      generalUtils.handleCliError(errorMessage, detail)
    }
    catch {}

    expect(consoleLogSpy).toHaveBeenCalledWith(ICONS.error, errorMessage)
    expect(consoleLogSpy).toHaveBeenCalledWith(ICONS.info, detail)
    expect(processExitMock).toHaveBeenCalledWith(1)
    expect(spiedHandleCliError).toHaveBeenCalledWith(errorMessage, detail)
  })

  it('should log error with multiple details and exit', () => {
    const errorMessage = 'Test error message'
    const details = ['Detail 1', 'Detail 2']
    try {
      generalUtils.handleCliError(errorMessage, details)
    }
    catch {}

    expect(consoleLogSpy).toHaveBeenCalledWith(ICONS.error, errorMessage)
    expect(consoleLogSpy).toHaveBeenCalledWith(ICONS.info, details[0])
    expect(consoleLogSpy).toHaveBeenCalledWith(ICONS.info, details[1])
    expect(processExitMock).toHaveBeenCalledWith(1)
    expect(spiedHandleCliError).toHaveBeenCalledWith(errorMessage, details)
  })
})
