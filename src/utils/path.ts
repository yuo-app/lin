import type { I18nConfig } from '@/config/i18n'
import path from 'node:path'
import process from 'node:process'

const cwd = process.env.INIT_CWD || process.cwd()
export function r(file: string, i18n?: I18nConfig) {
  if (i18n)
    return path.join(i18n.directory, file)
  return path.join(cwd, file)
}
