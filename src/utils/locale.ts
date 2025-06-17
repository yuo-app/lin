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

export function normalizeLocales(locales: string[], i18n: I18nConfig, argName = 'locale'): string[] {
  const normalized: string[] = []

  for (const locale of locales) {
    if (locale === 'all' || locale === '') {
      normalized.push(...i18n.locales)
    }
    else if (locale === 'def') {
      normalized.push(i18n.defaultLocale)
    }
    else if (locale.includes('-')) {
      if (!i18n.locales.includes(locale)) {
        const details = [`Available locales: ${i18n.locales.join(', ')}`]
        if (argName === 'with option')
          details.push('Available keywords: none, def, tgt, both, all')
        else if (argName === 'locale')
          details.push('Available keywords: all, def')
        handleCliError(`Invalid ${argName}: ${locale}`, details)
      }

      normalized.push(locale)
    }
    else {
      const matchingLocales = i18n.locales.filter(l => l.split('-')[0] === locale)
      if (matchingLocales.length === 0) {
        const details = [`Available locales: ${i18n.locales.join(', ')}`]
        if (argName === 'with option')
          details.push('Available keywords: none, def, tgt, both, all')
        else if (argName === 'locale')
          details.push('Available keywords: all, def')
        handleCliError(`Invalid ${argName}: ${locale}`, details)
      }

      normalized.push(...matchingLocales)
    }
  }

  return normalized
}

export function resolveContextLocales(
  withConfig: 'none' | 'def' | 'tgt' | 'both' | 'all' | string | string[],
  i18n: I18nConfig,
  targetLocales: string[],
): string[] {
  if (withConfig === 'none' || !withConfig)
    return []

  const withArray = Array.isArray(withConfig) ? withConfig : [withConfig]
  const resolvedLocales = new Set<string>()

  const keywords = ['def', 'tgt', 'both', 'all']
  const hasKeywords = withArray.some(item => keywords.includes(item))

  if (hasKeywords) {
    if (withArray.includes('all')) {
      i18n.locales.forEach(l => resolvedLocales.add(l))
    }
    else {
      if (withArray.includes('def') || withArray.includes('both'))
        resolvedLocales.add(i18n.defaultLocale)

      if (withArray.includes('tgt') || withArray.includes('both'))
        targetLocales.forEach(l => resolvedLocales.add(l))
    }
    const otherLocales = withArray.filter(item => !keywords.includes(item))
    if (otherLocales.length > 0) {
      const normalized = normalizeLocales(otherLocales, i18n, 'with option')
      normalized.forEach(l => resolvedLocales.add(l))
    }
  }
  else {
    const normalized = normalizeLocales(withArray, i18n, 'with option')
    normalized.forEach(l => resolvedLocales.add(l))
  }

  return [...resolvedLocales]
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

  const result = JSON.parse(JSON.stringify(existingTranslations || {}))

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
