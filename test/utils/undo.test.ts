import type { MockedFunction } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as undo from '@/utils/undo'
import { mockResolvedConfig } from '../test-helpers'

vi.mock('node:fs')

describe('undo utils', () => {
  let mockExistsSync: MockedFunction<typeof fs.existsSync>
  let mockMkdirSync: MockedFunction<typeof fs.mkdirSync>
  let mockWriteFileSync: MockedFunction<typeof fs.writeFileSync>
  let mockReadFileSync: MockedFunction<typeof fs.readFileSync>

  beforeEach(() => {
    vi.clearAllMocks()
    mockExistsSync = fs.existsSync as MockedFunction<typeof fs.existsSync>
    mockMkdirSync = fs.mkdirSync as MockedFunction<typeof fs.mkdirSync>
    mockWriteFileSync = fs.writeFileSync as MockedFunction<typeof fs.writeFileSync>
    mockReadFileSync = fs.readFileSync as MockedFunction<typeof fs.readFileSync>
  })

  describe('saveUndoState', () => {
    it('should not save if undo is disabled in config', () => {
      const config = { ...mockResolvedConfig, undo: false }
      undo.saveUndoState(['file1.json'], config as any)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('should not save if filePaths is empty', () => {
      const config = { ...mockResolvedConfig, undo: true }
      undo.saveUndoState([], config as any)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('should create undo directory if it does not exist', () => {
      const config = { ...mockResolvedConfig, undo: true }
      mockExistsSync.mockReturnValue(false)
      mockReadFileSync.mockReturnValue('{}')
      undo.saveUndoState(['file1.json'], config as any)
      const expectedDir = path.join(config.cwd, undo.UNDO_DIR)
      expect(mockMkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true })
    })

    it('should save correct data for existing and non-existing files', () => {
      const config = { ...mockResolvedConfig, undo: true }
      const existingFilePath = 'existing.json'
      const nonExistingFilePath = 'non-existing.json'
      const fileContent = '{"key":"value"}'
      const undoFilePath = path.join(config.cwd, undo.UNDO_DIR, undo.UNDO_FILE)

      mockExistsSync.mockImplementation(p => p === existingFilePath)
      mockReadFileSync.mockReturnValue(fileContent)

      undo.saveUndoState([existingFilePath, nonExistingFilePath], config as any)

      const expectedUndoData = {
        [existingFilePath]: fileContent,
        [nonExistingFilePath]: undo.UNDO_FILE_NON_EXISTENT,
      }

      expect(mockWriteFileSync).toHaveBeenCalledWith(
        undoFilePath,
        JSON.stringify(expectedUndoData, null, 2),
        { encoding: 'utf-8' },
      )
    })
  })
})
