import { defineCommand } from 'citty'
import { resolveConfig } from '../config'

export default defineCommand({
  meta: {
    name: 'verify',
    description: 'check everything is setup correctly',
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    console.log('verify', config)
  },
})
