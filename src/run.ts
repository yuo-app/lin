import type { CommandDef } from 'citty'
import type { Commands } from './commands'
import { Buffer } from 'node:buffer'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { runCommand as cittyRunCommand } from 'citty'
import { commands } from './commands'
import { console, ICONS } from './utils'
import { UNDO_DIR } from './utils/undo'

export interface RunOptions {
  /**
   * If true, intercept file modifications. No files will be written or deleted.
   * The captured writes will be included in the result.
   */
  dry?: boolean
  /**
   * Console-output behaviour.
   *  - 'live'   : normal console output (default)
   *  - 'capture': capture output *and* still print it
   *  - 'silent' : capture output but do NOT print it
   */
  output?: 'live' | 'capture' | 'silent'
}

export interface RunResult {
  /** The value returned by the command's run() implementation */
  result: unknown
  /** Captured stdout + stderr text (if captureOutput=true) */
  output?: string
  /** Map of filepath->content that the command attempted to write (only when dry=true) */
  writes?: Record<string, string>
  /** List of files the command attempted to delete (only when dry=true) */
  deletes?: string[]
}

/**
 * Programmatically run a lin command.
 *
 * @param command The name of the command to run.
 * @param rawArgs An array of raw arguments to pass to the command.
 * @param options Extra behaviour controls (dry-run, capture output)
 * @returns An object with the command result and, optionally, captured output & file changes.
 */
export async function run<T extends keyof Commands>(
  command: T,
  rawArgs: string[] = [],
  options: RunOptions = {},
): Promise<RunResult> {
  const { dry = false, output: outputMode = 'live' } = options as RunOptions & { output: 'live' | 'capture' | 'silent' }

  const cmdEntry = commands[command]
  if (!cmdEntry) {
    const err = new Error(`Command "${String(command)}" not found.`)
    console.log(ICONS.error, err.message)
    throw err
  }

  const commandDef: CommandDef = typeof cmdEntry === 'function'
    ? await (cmdEntry as any)()
    : (cmdEntry as unknown as CommandDef)

  // ---- Handle dry-run fs interception ----
  const writes: Record<string, string> = {}
  const deletes: string[] = []
  let restoreFs: (() => void) | undefined
  if (dry) {
    const originalWrite = fs.writeFileSync
    const originalUnlink = fs.unlinkSync

    const shouldCapture = (p: string) => !p.includes(`${path.sep}${UNDO_DIR}${path.sep}`)

    fs.writeFileSync = ((file, data) => {
      const filePath = typeof file === 'string' ? file : String(file)
      if (shouldCapture(filePath)) {
        const content = typeof data === 'string' ? data : data.toString()
        writes[filePath] = content
      }
      // skip actual write
      return undefined as any
    }) as typeof fs.writeFileSync

    fs.unlinkSync = ((file) => {
      const filePath = typeof file === 'string' ? file : String(file)
      if (shouldCapture(filePath))
        deletes.push(filePath)
      return undefined as any
    }) as typeof fs.unlinkSync

    restoreFs = () => {
      fs.writeFileSync = originalWrite
      fs.unlinkSync = originalUnlink
    }
  }

  // ---- Handle output capture ----
  let captured = ''
  let restoreOutput: (() => void) | undefined
  if (outputMode !== 'live') {
    const origStdoutWrite = process.stdout.write.bind(process.stdout) as typeof process.stdout.write
    const origStderrWrite = process.stderr.write.bind(process.stderr) as typeof process.stderr.write

    function patch(write: typeof process.stdout.write) {
      return function (chunk: any, ...rest: any[]) {
        captured += chunk instanceof Buffer ? chunk.toString() : String(chunk)
        if (outputMode !== 'silent')
          return write(chunk, ...rest)
        return true
      }
    }

    process.stdout.write = patch(origStdoutWrite)
    process.stderr.write = patch(origStderrWrite)

    restoreOutput = () => {
      process.stdout.write = origStdoutWrite
      process.stderr.write = origStderrWrite
    }
  }

  try {
    const result = await cittyRunCommand(commandDef, { rawArgs })
    return {
      result,
      output: outputMode !== 'live' ? captured : undefined,
      writes: dry ? writes : undefined,
      deletes: dry ? deletes : undefined,
    }
  }
  catch (error: any) {
    if (outputMode !== 'live' && !captured.includes(error.message))
      captured += `\n${error.message}`
    throw error
  }
  finally {
    if (restoreFs)
      restoreFs()
    if (restoreOutput)
      restoreOutput()
  }
}
