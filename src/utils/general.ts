import process from 'node:process'
import { console, ICONS } from './console'

export function handleCliError(message: string, details?: string | string[]): never {
  console.log(ICONS.error, message)
  if (details) {
    const detailArray = Array.isArray(details) ? details : [details]
    detailArray.forEach(detail => console.log(ICONS.info, detail))
  }
  process.exit(1)
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
