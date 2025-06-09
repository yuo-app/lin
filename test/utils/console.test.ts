import { Console } from 'node:console'
import process from 'node:process'
import c from 'picocolors'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { console, formatLog } from '@/utils/console'

describe('console utilities', () => {
  describe('formatLog', () => {
    it('should format code blocks with cyan color', () => {
      const input = 'This is a `code block`'
      const expected = `This is a ${c.cyan('code block')}`

      expect(formatLog(input)).toBe(expected)
    })

    it('should format bold text', () => {
      const input = 'This is **bold text**'
      const expected = `This is ${c.bold('bold text')}`

      expect(formatLog(input)).toBe(expected)
    })

    it('should format italic text', () => {
      const input = 'This is *italic text*'
      const expected = `This is ${c.italic('italic text')}`

      expect(formatLog(input)).toBe(expected)
    })

    it('should format underlined text', () => {
      const input = 'This is __underlined text__'
      const expected = `This is ${c.underline('underlined text')}`

      expect(formatLog(input)).toBe(expected)
    })

    it('should handle non-string input', () => {
      const input = { test: 'object' }
      expect(formatLog(input)).toBe(input)
    })

    it('should handle multiple formatting in one string', () => {
      const input = 'This is `code` and **bold** and *italic*'
      const expected = `This is ${c.cyan('code')} and ${c.bold('bold')} and ${c.italic('italic')}`

      expect(formatLog(input)).toBe(expected)
    })
  })

  describe('consoleExtended', () => {
    let stdoutWriteSpy: any
    let originalConsoleLog: any
    let logSpy: any

    beforeEach(() => {
      if (!process.stdout.clearLine)
        process.stdout.clearLine = () => true

      if (!process.stdout.cursorTo)
        process.stdout.cursorTo = () => true

      stdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
      originalConsoleLog = Console.prototype.log
      logSpy = vi.spyOn(Console.prototype, 'log').mockImplementation(() => {})
    })

    afterEach(() => {
      vi.restoreAllMocks()
      Console.prototype.log = originalConsoleLog
      vi.useRealTimers()
    })

    it('should log formatted messages', () => {
      console.log('Test `message`')

      expect(logSpy).toHaveBeenCalledWith(`Test ${c.cyan('message')}`)
    })

    it('should log without line break', () => {
      console.logL('Test `message`')

      expect(stdoutWriteSpy).toHaveBeenCalledWith(`Test ${c.cyan('message')}`)
    })
  })
})
