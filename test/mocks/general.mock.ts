import { vi } from 'vitest'

export const MOCKED_CLI_ERROR_MESSAGE = 'Mocked CLI Error: Execution should stop here.'

export const customMockHandleCliError = vi.fn((_message?: string, _details?: string | string[]) => {
  throw new Error(MOCKED_CLI_ERROR_MESSAGE)
})
