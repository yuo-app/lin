import fs from 'node:fs/promises'
import process from 'node:process'
import { defineCommand } from 'citty'
import OpenAI from 'openai'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import {
  console,
  findMissingKeys,
  ICONS,
  type LocaleJson,
  mergeMissingTranslations,
  normalizeLocales,
  r,
  shapeMatches,
} from '../utils'
import 'dotenv/config'

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
      description: 'ignore checks and translate the whole locale json',
      default: false,
    },
    ...commonArgs,
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const i18n = loadI18nConfig()
    const openai = new OpenAI({ apiKey: process.env[config.env] })

    const locales = normalizeLocales(args._, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales.filter(l => l !== i18n.default)
    const defaultLocaleJson = JSON.parse(await fs.readFile(r(`${i18n.default}.json`, i18n), { encoding: 'utf8' }))

    const keysToTranslate: Record<string, any> = {}
    for (const locale of localesToCheck) {
      if (args.force) {
        keysToTranslate[locale] = defaultLocaleJson
        console.log(ICONS.note, `Force translating entire JSON for locale: **${locale}**`)
      }
      else {
        let localeJson
        try {
          localeJson = JSON.parse(await fs.readFile(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
        }
        catch (error: any) {
          if (error.code === 'ENOENT') {
            console.log(ICONS.warning, `File not found for locale **${locale}**. Creating a new one.`)
            localeJson = {}
          }
          else {
            throw error
          }
        }

        if (shapeMatches(defaultLocaleJson, localeJson)) {
          console.log(ICONS.note, `Skipped: **${locale}**`)
          continue
        }

        const missingKeys = findMissingKeys(defaultLocaleJson, localeJson)
        if (Object.keys(missingKeys).length > 0) {
          keysToTranslate[locale] = missingKeys
        }
      }
    }

    if (config.debug)
      console.log(ICONS.note, `To translate: ${JSON.stringify(keysToTranslate)}`)

    if (Object.keys(keysToTranslate).length > 0) {
      await console.loading(`Translating ${args.force ? 'entire JSON' : 'missing keys'} for ${Object.keys(keysToTranslate).map(l => `**${l}**`).join(', ')}`, async () => {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a translation API that translates locale JSON files. 
              For each locale, translate the values from the default locale (${i18n.default}) language to the corresponding languages (denoted by the locale keys). 
              Return a JSON object where each top key is a locale, and the value is an object containing the translations for that locale.
              Example input:
              {"fr-FR": {"title": "Title"}}
              Example output:
              {"fr-FR": {"title": "Titre"}}`,
            },
            {
              role: 'user',
              content: JSON.stringify(keysToTranslate),
            },
          ],
          ...config.options,
          response_format: { type: 'json_object' },
        })

        const translations = JSON.parse(completion.choices[0].message.content || '{}') as Record<string, LocaleJson>
        if (config.debug)
          console.log(ICONS.note, `Translations: ${JSON.stringify(translations)}`)

        for (const [locale, newTranslations] of Object.entries(translations)) {
          const localeFilePath = r(`${locale}.json`, i18n)
          let finalTranslations: LocaleJson

          if (args.force) {
            finalTranslations = newTranslations
          }
          else {
            let existingTranslations = {}
            try {
              existingTranslations = JSON.parse(await fs.readFile(localeFilePath, { encoding: 'utf8' }))
            }
            catch (error: any) {
              if (error.code !== 'ENOENT')
                throw error
            }
            finalTranslations = mergeMissingTranslations(existingTranslations, newTranslations)
          }

          await fs.writeFile(localeFilePath, JSON.stringify(finalTranslations, null, 2), { encoding: 'utf8' })
        }
      })
    }
    else {
      console.log(ICONS.success, 'All locales are up to date.')
    }
  },
})
