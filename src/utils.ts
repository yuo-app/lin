import path from 'node:path'
import process from 'node:process'
import { Console } from 'node:console'
import c from 'picocolors'
import type { I18nConfig } from './i18n'

// #region Path utils
const cwd = process.env.INIT_CWD || process.cwd()
export function r(file: string, i18n?: I18nConfig) {
  if (i18n)
    return path.join(i18n.directory, file)
  return path.join(cwd, file)
}
// #endregion

// #region Type utils
export type DeepReadonly<T> = {
  readonly [K in keyof T]: keyof T[K] extends never ? T[K] : DeepReadonly<T[K]>
}

export type DeepPartial<T> = {
  [K in keyof T]?: keyof T[K] extends never ? T[K] : DeepPartial<T[K]>
}

export type DeepRequired<T> = {
  [K in keyof T]-?: keyof T[K] extends never ? T[K] : DeepRequired<T[K]>
}
// #endregion

// #region Utils
export function haveSameShape(obj1: any, obj2: any): boolean {
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null) {
    return false
  }

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) {
    return false
  }

  for (const key of keys1) {
    if (!keys2.includes(key)) {
      return false
    }

    if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
      if (!haveSameShape(obj1[key], obj2[key])) {
        return false
      }
    }
  }

  return true
}
// #endregion

// #region Console utils
export const ICONS = {
  success: c.green('✓'),
  error: c.red('✗'),
  note: c.blue('ℹ'),
}

function formatLog(message: any): string {
  if (typeof message !== 'string')
    message = String(message)

  return (message as string)
    .replace(/`([^`]+)`/g, (_, p1) => `${c.cyan(p1)}`)
    .replace(/\*\*([^*]+)\*\*/g, (_, p1) => `${c.bold(p1)}`)
    .replace(/\*([^*]+)\*/g, (_, p1) => `${c.italic(p1)}`)
    .replace(/__([^_]+)__/g, (_, p1) => `${c.underline(p1)}`)
}

function createLoadingIndicator(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const interval = setInterval(() => {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
    process.stdout.write(`${c.yellow(frames[i])} ${formatLog(message)}`)
    i = (i + 1) % frames.length
  }, 100)

  return async () => {
    clearInterval(interval)
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
  }
}

class ConsoleExtended extends Console {
  log(...messages: any[]): void {
    if (typeof messages[0] === 'string')
      super.log(...messages.map(formatLog))
    else
      super.log(...messages)
  }

  async loading<T>(message: string, callback: () => Promise<T>): Promise<T> {
    const stopLoading = createLoadingIndicator(message)

    try {
      const result = await callback()
      await stopLoading()
      this.log(`${ICONS.success} ${message}`)
      return result
    }
    catch (error) {
      stopLoading()
      this.log(`${ICONS.error} ${message}`)
      throw error
    }
  }
}

const consoleExtended = new ConsoleExtended(process.stdout, process.stderr, false)
export { consoleExtended as console }
// #endregion
