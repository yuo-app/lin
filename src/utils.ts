import path from 'node:path'
import process from 'node:process'
import { Console } from 'node:console'

const cwd = process.env.INIT_CWD || process.cwd()
export const r = (file: string) => path.join(cwd, file)

const styles = {
  cyan: '\x1B[36m',
  bold: '\x1B[1m',
  italic: '\x1B[3m',
  underline: '\x1B[4m',
  reset: '\x1B[0m',
}

function formatLog(str: unknown) {
  if (typeof str !== 'string')
    return str
  return str
    .replace(/`([^`]+)`/g, (_, p1) => `${styles.cyan}${p1}${styles.reset}`)
    .replace(/\*\*([^*]+)\*\*/g, (_, p1) => `${styles.bold}${p1}${styles.reset}`)
    .replace(/\*([^*]+)\*/g, (_, p1) => `${styles.italic}${p1}${styles.reset}`)
    .replace(/__([^_]+)__/g, (_, p1) => `${styles.underline}${p1}${styles.reset}`)
}

class ConsoleExtended extends Console {
  log(...data: any[]): void
  log(message?: unknown, ...optionalParams: unknown[]): void {
    super.log(formatLog(message), ...optionalParams)
  }
}

const consoleExtended = new ConsoleExtended(process.stdout, process.stderr, false)
export { consoleExtended as console }
