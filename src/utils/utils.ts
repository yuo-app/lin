import type { I18nConfig } from '../i18n'
import type { DeleteType, NestedKeyOf, NestedValueOf } from '../types'
import path from 'node:path'
import process from 'node:process'

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
// #endregion

// #region Nested key utils
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

type NestedObject = Record<string, any>

export function sortKeys(obj: NestedObject): NestedObject
export function sortKeys(obj: NestedObject, mode: 'abc'): NestedObject
export function sortKeys(obj: NestedObject, mode: 'ref', refObj: NestedObject): NestedObject
export function sortKeys(obj: NestedObject, mode: 'abc' | 'ref' = 'abc', refObj?: NestedObject): NestedObject {
  if (typeof obj !== 'object' || obj === null)
    return obj

  if (Array.isArray(obj))
    return obj.map(item => sortKeys(item, mode as 'abc'))

  const sortedKeys = Object.keys(obj).sort((a, b) => {
    if (mode === 'abc') {
      return a.localeCompare(b)
    }
    else if (mode === 'ref' && refObj) {
      const refKeys = Object.keys(refObj)
      return refKeys.indexOf(a) - refKeys.indexOf(b)
    }
    return 0
  })

  const sortedObj: NestedObject = {}
  for (const key of sortedKeys) {
    if (mode === 'ref' && refObj) {
      sortedObj[key] = sortKeys(
        obj[key],
        mode,
        typeof refObj[key] === 'object' ? refObj[key] : undefined,
      )
    }
    else {
      sortedObj[key] = sortKeys(obj[key], 'abc')
    }
  }

  return sortedObj
}
