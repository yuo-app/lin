import type { LocaleJson } from './locale'
import process from 'node:process'
import { console, ICONS } from './console'
import { findNestedKey, getAllKeys } from './nested'

export function handleCliError(message: string, details?: string | string[]): never {
  console.log(ICONS.error, message)
  if (details) {
    const detailArray = Array.isArray(details) ? details : [details]
    detailArray.forEach(detail => console.log(ICONS.info, detail))
  }
  process.exit(1)
}

export function provideSuggestions(json: LocaleJson, key: string): boolean {
  if (!key)
    return false

  if (key.endsWith('.')) {
    const path = key.slice(0, -1)
    const { value: nestedValue } = findNestedKey(json, path)
    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      const suggestions = Object.keys(nestedValue)
      if (suggestions.length > 0) {
        console.log(ICONS.info, `Available keys under \`${path}\`:`)
        suggestions.forEach(s => console.log(`  - ${key}${s}`))
        return true
      }
    }
  }

  const { value: exactMatch } = findNestedKey(json, key)
  if (exactMatch === undefined) {
    const allKeys = getAllKeys(json)
    const suggestions = allKeys.filter(k => k.startsWith(key))
    if (suggestions.length > 0) {
      console.log(ICONS.info, `Key \`${key}\` not found. Did you mean:`)
      suggestions.slice(0, 15).forEach(s => console.log(`  - ${s}`))
      return true
    }
  }

  return false
}

export function catchError<T extends (...args: any[]) => any>(
  callback: T,
): (...args: Parameters<T>) => ReturnType<T> {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      return callback(...args)
    }
    catch (error: any) {
      handleCliError(error.message)
    }
  }
}

export function checkArg(name: string | undefined, list: readonly string[], argDescription?: string) {
  if (name && !list.includes(name)) {
    const message = `Invalid ${argDescription || 'argument'} "\`${name}\`"`
    const details = `Must be one of ${list.join(', ')}.`
    handleCliError(message, details)
  }
}
