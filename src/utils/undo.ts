import type { Config, ResolvedConfig } from '@/config'
import fs from 'node:fs'
import path from 'node:path'
import { console, ICONS } from './console'

export const UNDO_DIR = '.lin'
export const UNDO_FILE = 'undo.json'
export const UNDO_FILE_NON_EXISTENT = '__LIN_FILE_DOES_NOT_EXIST__'

function getUndoFilepath(config: Config): string {
  const undoDirPath = path.join(config.cwd, UNDO_DIR)
  return path.join(undoDirPath, UNDO_FILE)
}

export function saveUndoState(filePaths: string[], config: ResolvedConfig) {
  if (!config.undo || filePaths.length === 0)
    return

  const undoFilepath = getUndoFilepath(config)
  const undoDirPath = path.dirname(undoFilepath)

  if (!fs.existsSync(undoDirPath))
    fs.mkdirSync(undoDirPath, { recursive: true })

  const undoData: Record<string, string> = {}
  for (const filePath of filePaths) {
    if (fs.existsSync(filePath))
      undoData[filePath] = fs.readFileSync(filePath, 'utf-8')
    else
      undoData[filePath] = UNDO_FILE_NON_EXISTENT
  }

  try {
    fs.writeFileSync(undoFilepath, JSON.stringify(undoData, null, 2), { encoding: 'utf-8' })
  }
  catch (error) {
    console.log(ICONS.error, `Failed to save undo state: ${error}`)
  }
}
