import process from 'node:process'
import { defineCommand } from 'citty'
import c from 'picocolors'
import { resolveConfig } from '../config'
import { console, createLoadingIndicator } from '../utils'

export default defineCommand({
  meta: {
    name: 'verify',
    description: 'check everything is setup correctly',
  },
  async run({ args }) {
    console.loading('Load data', async () => {
      await new Promise(resolve => setTimeout(resolve, 3000))
    })
  },
})
