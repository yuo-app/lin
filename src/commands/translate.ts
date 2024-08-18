import 'dotenv/config'
import process from 'node:process'
import { defineCommand } from 'citty'
import { loadI18nConfig } from '../i18n'
import { resolveConfig } from '../config'

export default defineCommand({
  meta: {
    name: 'translate',
    description: 'translate locales',
  },
  async run({ args }) {
    const i18n = loadI18nConfig()
    console.log(i18n.default)
    const { config } = await resolveConfig(args)
    console.log(process.env[config.env as string])
  },
})
