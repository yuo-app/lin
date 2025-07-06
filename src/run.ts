import type { CommandDef } from 'citty'
import { runCommand as cittyRunCommand } from 'citty'
import { commands, type Commands } from './commands'
import { console, ICONS } from './utils'

/**
 * Programmatically run a lin command.
 *
 * @param command The name of the command to run.
 * @param rawArgs An array of raw arguments to pass to the command.
 * @returns A promise that resolves with the result of the command.
 */
export async function run<T extends keyof Commands>(
  command: T,
  rawArgs: string[] = [],
) {
  const cmdEntry = commands[command]
  if (!cmdEntry) {
    const err = new Error(`Command "${String(command)}" not found.`)
    console.log(ICONS.error, err.message)
    throw err
  }

  const commandDef: CommandDef = typeof cmdEntry === 'function'
    ? await (cmdEntry as any)()
    : (cmdEntry as unknown as CommandDef)

  try {
    return await cittyRunCommand(commandDef, { rawArgs })
  }
  catch (error: any) {
    console.log(ICONS.error, error.message)
    throw error
  }
}
