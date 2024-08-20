import path from 'node:path'
import process from 'node:process'
import { Console } from 'node:console'
import c from 'picocolors'

const cwd = process.env.INIT_CWD || process.cwd()
export const r = (file: string) => path.join(cwd, file)

function formatLog(str: unknown) {
  if (typeof str !== 'string')
    return str
  return str
    .replace(/`([^`]+)`/g, (_, p1) => `${c.cyan(p1)}`)
    .replace(/\*\*([^*]+)\*\*/g, (_, p1) => `${c.bold(p1)}`)
    .replace(/\*([^*]+)\*/g, (_, p1) => `${c.italic(p1)}`)
    .replace(/__([^_]+)__/g, (_, p1) => `${c.underline(p1)}`)
}

export function createLoadingIndicator(message: string) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let i = 0
  const interval = setInterval(() => {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
    process.stdout.write(`${c.yellow(frames[i])} ${message}`)
    i = (i + 1) % frames.length
  }, 100)

  return () => {
    clearInterval(interval)
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
  }
}

class ConsoleExtended extends Console {
  log(...data: any[]): void
  log(message?: unknown, ...optionalParams: unknown[]): void {
    super.log(formatLog(message), ...optionalParams)
  }

  loading(message: string, callback: () => void) {
    const stopLoading = createLoadingIndicator(message)

    setTimeout(() => {
      stopLoading()
      callback()
    }, 3000)
  }
}

const consoleExtended = new ConsoleExtended(process.stdout, process.stderr, false)
export { consoleExtended as console }
