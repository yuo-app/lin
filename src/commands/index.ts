import type { CommandDef } from 'citty'

const _rDefault = (r: any) => (r.default || r) as Promise<CommandDef>

export const commands = {
  translate: () => import('./translate').then(_rDefault),
  sync: () => import('./sync').then(_rDefault),
  add: () => import('./add').then(_rDefault),
  edit: () => import('./edit').then(_rDefault),
  del: () => import('./del').then(_rDefault),
  check: () => import('./check').then(_rDefault),
  verify: () => import('./verify').then(_rDefault),
  models: () => import('./models').then(_rDefault),
  undo: () => import('./undo').then(_rDefault),
} as const
