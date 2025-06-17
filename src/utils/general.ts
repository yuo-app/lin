import type { LocaleJson } from './locale'
import process from 'node:process'
import c from 'picocolors'
import { console, ICONS } from './console'
import { countKeys, findNestedValue } from './nested'

function printSuggestionLine(highlightedKey: string, value: any) {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const subKeyCount = countKeys(value)
    if (subKeyCount > 0)
      console.log(`  - ${highlightedKey} ${c.dim(`(${subKeyCount} sub-keys)`)}`)
    else
      console.log(`  - ${highlightedKey} ${c.dim('(empty)')}`)
  }
  else {
    console.log(`  - ${highlightedKey}`)
  }
}

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
    const nestedValue = findNestedValue(json, path)

    if (nestedValue && typeof nestedValue === 'object' && !Array.isArray(nestedValue)) {
      const suggestions = Object.keys(nestedValue)
      if (suggestions.length > 0) {
        console.log(ICONS.info, `Available keys under \`${path}\`:`)
        suggestions.forEach(s => printSuggestionLine(`\`${key}\`${s}`, nestedValue[s]))
        return true
      }
    }
  }

  const exactMatch = findNestedValue(json, key)
  if (exactMatch !== undefined)
    return false

  const keyParts = key.split('.')
  const prefix = keyParts.pop() || ''
  const parentPath = keyParts.join('.')
  const parentObject = findNestedValue(json, parentPath)

  if (parentObject && typeof parentObject === 'object' && !Array.isArray(parentObject)) {
    const suggestions = Object.keys(parentObject).filter(k => k.startsWith(prefix))

    if (suggestions.length > 0) {
      console.log(ICONS.info, `Key \`${key}\` not found. Did you mean:`)
      suggestions.slice(0, 15).forEach((s) => {
        const highlightedKey = `\`${parentPath ? `${parentPath}.${prefix}` : prefix}\`${s.substring(prefix.length)}`
        printSuggestionLine(highlightedKey, parentObject[s])
      })
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
