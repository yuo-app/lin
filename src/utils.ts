import { Console } from 'node:console'
import path from 'node:path'
import process from 'node:process'
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

// #region Utils
export function shapeMatches(obj1: any, obj2: any): boolean {
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
      if (!shapeMatches(obj1[key], obj2[key])) {
        return false
      }
    }
  }

  return true
}

export function normalizeLocales(locales: string[], i18n: I18nConfig): string[] {
  const normalized: string[] = []

  for (const locale of locales) {
    if (locale === 'all') {
      normalized.push(...i18n.locales)
    }
    else if (locale === 'def') {
      normalized.push(i18n.default)
    }
    else if (locale.includes('-')) {
      if (!i18n.locales.includes(locale))
        throw new Error(`Invalid locale: ${locale}`)

      normalized.push(locale)
    }
    else {
      const matchingLocales = i18n.locales.filter(l => l.split('-')[0] === locale)
      if (matchingLocales.length === 0)
        throw new Error(`Invalid locale: ${locale}`)

      normalized.push(...matchingLocales)
    }
  }

  return normalized
}

interface LocaleJson {
  [key: string]: string | LocaleJson
}

export function findMissingKeys(defaultObj: LocaleJson, localeObj: LocaleJson, prefix = ''): LocaleJson {
  const missingKeys: LocaleJson = {}

  for (const key in defaultObj) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof defaultObj[key] === 'object' && defaultObj[key] !== null) {
      const nestedMissing = findMissingKeys(defaultObj[key], localeObj[key] as LocaleJson || {}, fullKey)
      Object.assign(missingKeys, nestedMissing)
    }
    else if (!(key in localeObj)) {
      missingKeys[fullKey] = defaultObj[key]
    }
  }

  return missingKeys
}

export function mergeMissingTranslations(existingTranslations: LocaleJson, missingTranslations: LocaleJson): LocaleJson {
  const result = { ...existingTranslations }

  for (const [key, value] of Object.entries(missingTranslations)) {
    const keys = key.split('.')
    let current = result

    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {}
      }
      current = current[keys[i]] as LocaleJson
    }

    current[keys[keys.length - 1]] = value
  }

  return result
}

export function setNestedKey(obj: any, key: string, value: any) {
  const keys = key.split('.')
  let current = obj
  keys.forEach((key, index) => {
    if (!current[key]) {
      current[key] = {}
    }
    if (index === keys.length - 1) {
      current[key] = value
    }
    current = current[key]
  })
  return obj
}
// #endregion

// #region Console utils
export const ICONS = {
  success: c.green('✓'),
  warning: c.yellow('⚠'),
  error: c.red('✗'),
  note: c.blue('ℹ'),
}

function formatLog(message: any): string {
  if (typeof message !== 'string')
    return message

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
    super.log(...messages.map(formatLog))
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
