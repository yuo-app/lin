import path from 'node:path'
import process from 'node:process'

const cwd = process.env.INIT_CWD || process.cwd()
export const r = (file: string) => path.join(cwd, file)
