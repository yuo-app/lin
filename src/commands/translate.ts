import 'dotenv/config'
import process from 'node:process'
import fs from 'node:fs/promises'
import OpenAI from 'openai'
import { defineCommand } from 'citty'
import { ICONS, console, normalizeLocales, r, shapeMatches } from '../utils'
import { resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'

export default defineCommand({
  meta: {
    name: 'translate',
    description: 'translate locales',
  },
  args: {
    locales: {
      alias: 'l',
      type: 'positional',
      description: 'the locales to translate',
      required: false,
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: 'force to translate all locales',
      default: false,
    },
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const i18n = loadI18nConfig()
    const openai = new OpenAI({ apiKey: process.env[config.env] })

    const locales = normalizeLocales(args._, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales.filter(l => l !== i18n.default)
    const defaultLocaleJson = await fs.readFile(r(`${i18n.default}.json`, i18n), { encoding: 'utf8' })

    for (const locale of localesToCheck) {
      if (!args.force) {
        const localeJson = await fs.readFile(r(`${locale}.json`, i18n), { encoding: 'utf8' })

        if (shapeMatches(JSON.parse(defaultLocaleJson), JSON.parse(localeJson))) {
          console.log(ICONS.note, `Skipped: **${locale}**`)
          continue
        }
      }

      await console.loading(`Translate: **${locale}**`, async () => {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a simple api that translates locale jsons from ${i18n.default} to ${locale}.
Your recieve just the input json and return just the translated json.`,
            },
            {
              role: 'user',
              content: defaultLocaleJson,
            },
          ],
          ...config.options,
          response_format: { type: 'json_object' },
        })

        await fs.writeFile(r(`${locale}.json`, i18n), completion.choices[0].message.content as string, { encoding: 'utf8' })
      })
    }
  },
})
