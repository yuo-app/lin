import type { I18nConfig } from '@/config/i18n'
import { handleCliError } from './general'

export function shapeMatches(obj1: any, obj2: any): boolean {
  if (typeof obj1 !== 'object' || typeof obj2 !== 'object' || obj1 === null || obj2 === null)
    return false

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length)
    return false

  for (const key of keys1) {
    if (!keys2.includes(key))
      return false

    const val1IsObject = typeof obj1[key] === 'object' && obj1[key] !== null
    const val2IsObject = typeof obj2[key] === 'object' && obj2[key] !== null

    if (val1IsObject && val2IsObject) {
      if (!shapeMatches(obj1[key], obj2[key]))
        return false
    }
    else if (val1IsObject !== val2IsObject) {
      return false
    }
  }

  return true
}

export function normalizeLocales(locales: string[], i18n: I18nConfig): string[] {
  const normalized: string[] = []

  for (const locale of locales) {
    if (locale === 'all' || locale === '') {
      normalized.push(...i18n.locales)
    }
    else if (locale === 'def') {
      normalized.push(i18n.defaultLocale)
    }
    else if (locale.includes('-')) {
      if (!i18n.locales.includes(locale))
        handleCliError(`Invalid locale: ${locale}`, `Available locales: ${i18n.locales.join(', ')}`)

      normalized.push(locale)
    }
    else {
      const matchingLocales = i18n.locales.filter(l => l.split('-')[0] === locale)
      if (matchingLocales.length === 0)
        handleCliError(`Invalid locale: ${locale}`, `Available locales: ${i18n.locales.join(', ')}`)

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
      const correspondingLocaleValue = localeObj[key]
      const localeForRecursion = (typeof correspondingLocaleValue === 'object' && correspondingLocaleValue !== null)
        ? correspondingLocaleValue as LocaleJson
        : {}
      const nestedMissing = findMissingKeys(
        defaultObj[key] as LocaleJson,
        localeForRecursion,
        fullKey,
      )
      Object.assign(missingKeys, nestedMissing)
    }
    else {
      if (!(key in localeObj) || (typeof localeObj[key] === 'object' && localeObj[key] !== null))
        missingKeys[fullKey] = defaultObj[key] as string
    }
  }

  return missingKeys
}

export function mergeMissingTranslations(existingTranslations: LocaleJson | undefined, missingTranslations: LocaleJson | undefined): LocaleJson {
  if (missingTranslations === undefined)
    return existingTranslations || {}

  const result = existingTranslations === undefined ? {} : { ...existingTranslations }

  for (const [key, value] of Object.entries(missingTranslations)) {
    const keys = key.split('.')
    let current: LocaleJson = result

    for (let i = 0; i < keys.length - 1; i++) {
      const currentKeySegment = keys[i]
      if (!(currentKeySegment in current) || typeof current[currentKeySegment] !== 'object' || current[currentKeySegment] === null)
        current[currentKeySegment] = {}
      current = current[currentKeySegment] as LocaleJson
    }

    current[keys[keys.length - 1]] = value
  }

  return result
}
