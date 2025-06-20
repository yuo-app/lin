import { Console } from 'node:console'
import process from 'node:process'
import c from 'picocolors'

export const ICONS = {
  success: c.green('✓'),
  warning: c.yellow('⚠'),
  error: c.red('✗'),
  info: c.blue('ℹ'),
  note: c.dim('●'),
  result: c.green('>.. '),
}

export function formatLog(message: any): string {
  if (typeof message !== 'string')
    return message

  return (message as string)
    .replace(/`([^`]+)`/g, (_, p1) => `${c.cyan(p1)}`)
    .replace(/\*\*([^*]+)\*\*/g, (_, p1) => `${c.bold(p1)}`)
    .replace(/\*([^*]+)\*/g, (_, p1) => `${c.italic(p1)}`)
    .replace(/__([^_]+)__/g, (_, p1) => `${c.underline(p1)}`)
}

export function generateScoreDots(score: number | undefined, color: (str: string) => string): string {
  if (score === undefined)
    return ''
  const filled = '●'
  const empty = '○'
  let dots = ''
  for (let i = 0; i < 5; i++)
    dots += i < score ? filled : empty

  return `${color(dots)} ${color(String(score))}`
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
    if (!process.stdout.isTTY) {
      this.log(`${ICONS.note} ${message}`)
      try {
        const result = await callback()
        this.log(`${ICONS.success} ${message}`)
        return result
      }
      catch (error) {
        this.log(`${ICONS.error} ${message}`)
        throw error
      }
    }

    const stopLoading = createLoadingIndicator(message)

    try {
      const result = await callback()
      await stopLoading()
      this.log(`${ICONS.success} ${message}`)
      return result
    }
    catch (errorFromCallback) {
      try {
        await stopLoading()
      }
      catch (errorDuringCleanup) {
        super.log('Error during loading indicator cleanup:', errorDuringCleanup)
      }
      this.log(`${ICONS.error} ${message}`)
      throw errorFromCallback
    }
  }
}

const consoleExtended = new ConsoleExtended(process.stdout, process.stderr, false)
export { consoleExtended as console }
