import { defineCommand, parseArgs } from 'citty'
import { resolveConfig } from '../config'

export default defineCommand({
  meta: {
    name: 'verify',
    description: 'check everything is setup correctly',
  },
  async run({ args }) {
    console.log('verify', args)

    // const { config } = await resolveConfig(args)
  },
})
