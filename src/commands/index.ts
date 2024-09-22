import type { CommandDef } from 'citty'

const _rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  translate: () => import('./translate').then(_rDefault),
  add: () => import('./add').then(_rDefault),
  del: () => import('./del').then(_rDefault),
  tidy: () => import('./tidy').then(_rDefault),
  verify: () => import('./verify').then(_rDefault),
} as const
