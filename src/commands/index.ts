import { defineCommand, runMain } from 'citty'
import type { CommandDef } from 'citty'
import { version } from '../../package.json'

const _rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  translate: () => import('./translate').then(_rDefault),
  add: () => import('./add').then(_rDefault),
  verify: () => import('./verify').then(_rDefault),
} as const

const main = defineCommand({
  meta: {
    name: 'lin',
    description: 'Localization manager and translator',
    version,
  },
  subCommands: commands,
})

runMain(main)
