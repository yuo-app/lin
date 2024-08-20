import 'dotenv/config'
import process from 'node:process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { defineCommand } from 'citty'
import OpenAI from 'openai'
import { loadI18nConfig } from '../i18n'
import { resolveConfig } from '../config'
import { console } from '../utils'

export default defineCommand({
  meta: {
    name: 'translate',
    description: 'translate locales',
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const i18n = loadI18nConfig()
    const openai = new OpenAI({ apiKey: process.env[config.env as string] })

    const defaultLocale = await fs.readFile(
      path.join(i18n.directory, `${i18n.default}.json`),
      { encoding: 'utf8' },
    )

    for (const locale of i18n.locales.filter(l => l !== i18n.default)) {
      await console.loading(`Translate ${locale}`, async () => {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a simple api that translates locale jsons from ${i18n.default} to ${locale}. Your recieve just the input json and return just the translated json.`,
            },
            {
              role: 'user',
              content: defaultLocale,
            },
          ],
          model: config.model as OpenAI.ChatModel,
        })

        await fs.writeFile(
          path.join(i18n.directory, `${locale}.json`),
          completion.choices[0].message.content as string,
          { encoding: 'utf8' },
        )
      })
    }
  },
})
