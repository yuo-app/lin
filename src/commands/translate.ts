import 'dotenv/config'
import process from 'node:process'
import fs from 'node:fs/promises'
import OpenAI from 'openai'
import { defineCommand } from 'citty'
import { ICONS, console, findMissingKeys, mergeMissingTranslations, normalizeLocales, r, shapeMatches } from '../utils'
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
    const defaultLocaleJson = JSON.parse(await fs.readFile(r(`${i18n.default}.json`, i18n), { encoding: 'utf8' }))

    const missingKeysPerLocale: Record<string, any> = {}
    for (const locale of localesToCheck) {
      let localeJson
      try {
        localeJson = JSON.parse(await fs.readFile(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
      }
      catch (error: any) {
        if (error.code === 'ENOENT') {
          console.log(ICONS.warning, `File not found for locale ${locale}. Creating a new one.`)
          localeJson = {}
        }
        else {
          throw error
        }
      }

      if (!args.force && shapeMatches(defaultLocaleJson, localeJson)) {
        console.log(ICONS.note, `Skipped: **${locale}**`)
        continue
      }

      const missingKeys = findMissingKeys(defaultLocaleJson, localeJson)
      if (Object.keys(missingKeys).length > 0) {
        missingKeysPerLocale[locale] = missingKeys
      }
    }

    console.log(ICONS.note, `Found: ${JSON.stringify(missingKeysPerLocale)}`)
    if (Object.keys(missingKeysPerLocale).length > 0) {
      await console.loading(`Translating missing keys for ${Object.keys(missingKeysPerLocale).join(', ')}`, async () => {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a translation API that translates locale JSON files. 
              For each locale, translate the values from the default locale (${i18n.default}) language to the corresponding languages (denoted by the locale keys). 
              Return a JSON object where each key is a locale, and the value is an object containing the translations for the missing keys.
              Example input:
              {"fr-FR": {"title": "Title"}}
              Example output:
              {"fr-FR": {"title": "Titre"}}`,
            },
            {
              role: 'user',
              content: JSON.stringify(missingKeysPerLocale),
            },
          ],
          ...config.options,
          response_format: { type: 'json_object' },
        })

        const translations = JSON.parse(completion.choices[0].message.content || '{}')
        console.log(ICONS.note, `Translations: ${JSON.stringify(translations)}`)

        for (const [locale, missingTranslations] of Object.entries(translations)) {
          const localeFilePath = r(`${locale}.json`, i18n)
          let existingTranslations = {}
          try {
            existingTranslations = JSON.parse(await fs.readFile(localeFilePath, { encoding: 'utf8' }))
          }
          catch (error: any) {
            if (error.code === 'ENOENT') {
              console.log(ICONS.warning, `Creating new file for locale ${locale}`)
            }
            else {
              throw error
            }
          }

          const mergedTranslations = mergeMissingTranslations(existingTranslations, missingTranslations)
          await fs.writeFile(localeFilePath, JSON.stringify(mergedTranslations, null, 2), { encoding: 'utf8' })
        }
      })
    }
    else {
      console.log(ICONS.success, 'All locales are up to date.')
    }
  },
})
