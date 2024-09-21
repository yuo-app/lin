import type OpenAI from 'openai'
import type { Config } from './config'
import type { I18nConfig } from './i18n'
import type { DeepRequired } from './types'
import { Console } from 'node:console'
import path from 'node:path'
import process from 'node:process'
import c from 'picocolors'

// #region Path utils
const cwd = process.env.INIT_CWD || process.cwd()
export function r(file: string, i18n?: I18nConfig) {
  if (i18n)
    return path.join(i18n.directory, file)
  return path.join(cwd, file)
}
// #endregion

// #region Locale utils
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

export interface LocaleJson {
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
  if (existingTranslations === undefined)
    return missingTranslations

  if (missingTranslations === undefined)
    return existingTranslations

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

type Primitive = string | number | boolean | null | undefined

type NestedKeyOf<T> = T extends Primitive
  ? never
  : T extends any[]
    ? never
    : {
        [K in keyof T & (string | number)]: K extends string | number
          ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
          : never;
      }[keyof T & (string | number)]

type NestedValueOf<T, K extends string> = K extends keyof T
  ? T[K]
  : K extends `${infer F}.${infer R}`
    ? F extends keyof T
      ? NestedValueOf<T[F], R>
      : never
    : never

type DeleteType<T, K extends string> = K extends keyof T
  ? Omit<T, K>
  : K extends `${infer F}.${infer R}`
    ? F extends keyof T
      ? Omit<T, F> & Record<F, DeleteType<T[F], R>>
      : T
    : T

export function findNestedKey<T extends Record<string | number, any>, K extends NestedKeyOf<T>>(
  obj: T,
  key: K,
) {
  const keys = key.split('.').map(k => !Number.isNaN(Number(k)) ? Number(k) : k)
  let current: any = obj
  const parents: any[] = []

  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    if (!(k in current)) {
      current[k] = typeof keys[i + 1] === 'number' ? [] : {}
    }
    parents.push(current)
    current = current[k]
  }

  const lastKey = keys[keys.length - 1]

  return {
    value: current[lastKey] as NestedValueOf<T, K>,
    delete: (): DeleteType<T, K> => {
      delete current[lastKey]
      return obj as DeleteType<T, K>
    },
  }
}

export function countKeys(obj: Record<string, any>): number {
  let count = 0

  for (const key of Object.keys(obj)) {
    count++

    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key]))
      count += countKeys(obj[key])
  }

  return count
}
// #endregion

// #region GPT utils
export function getWithLocales(args: Record<string, any>, i18n: I18nConfig) {
  const includeContext = args.with === ''
  const withArg = typeof args.with === 'string' ? [args.with] : args.with || []
  const withLocales = normalizeLocales(withArg, i18n)
  return { withLocales, includeContext }
}

export async function translateKeys(
  keysToTranslate: Record<string, LocaleJson>,
  config: DeepRequired<Config>,
  i18n: I18nConfig,
  openai: OpenAI,
  withLocaleJsons?: Record<string, LocaleJson>,
  includeContext?: boolean,
) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a translation API that translates locale JSON files. 
${includeContext && i18n.context ? `Additional information from user: ${i18n.context}` : ''}
For each locale, translate the values from the default locale (${i18n.default}) language to the corresponding languages (denoted by the locale keys). 
Return a JSON object where each top key is a locale, and the value is an object containing the translations for that locale.
${withLocaleJsons ? `Other locale JSONs from the user's codebase for context: ${JSON.stringify(withLocaleJsons)}\nAlways use dot notation when dealing with nested keys:` : ''}
Example input:
{"fr-FR": {"ui.home.title": "Title"}}
Example output:
{"fr-FR": {"ui.home.title": "Titre"}}`,
      },
      {
        role: 'user',
        content: JSON.stringify(keysToTranslate),
      },
    ],
    ...config.options,
    response_format: { type: 'json_object' },
  })
  return JSON.parse(completion.choices[0].message.content || '{}') as Record<string, LocaleJson>
}
// #endregion

// #region Console utils
export const ICONS = {
  success: c.green('✓'),
  warning: c.yellow('⚠'),
  error: c.red('✗'),
  info: c.blue('ℹ'),
  note: c.dim('●'),
  result: c.green('>.. '),
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

  logL(...messages: any[]): void {
    process.stdout.write(`${(messages.map(formatLog)).join(' ')}`)
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
