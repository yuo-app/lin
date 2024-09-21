import fs from 'node:fs'
import process from 'node:process'
import { text } from '@clack/prompts'
import { defineCommand } from 'citty'
import OpenAI from 'openai'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import {
  console,
  findNestedKey,
  getWithLocales,
  ICONS,
  type LocaleJson,
  mergeMissingTranslations,
  normalizeLocales,
  r,
  translateKeys,
} from '../utils'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'add a key to the locales with all the translations',
  },
  args: {
    key: {
      type: 'positional',
      description: 'the key to add',
      required: true,
      valueHint: 'a.b.c',
    },
    translation: {
      type: 'positional',
      description: 'the text of the key for the default locale',
      required: false,
      valueHint: 'some translation text',
    },
    locale: {
      alias: 'l',
      type: 'string',
      description: 'translate only the specified locale',
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: 'force add key overriding existing ones',
      default: false,
    },
    with: {
      alias: 'w',
      type: 'string',
      description: 'add a locale json to the context window',
    },
    ...commonArgs,
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const i18n = loadI18nConfig()
    const openai = new OpenAI({ apiKey: process.env[config.env] })

    args._.shift() // remove the key
    let prompt: string | symbol

    if (args._.length === 0) {
      prompt = await text({
        message: `Enter ${i18n.default} translation for key ${args.key}`,
        placeholder: 'Press [ENTER] to skip',
      })

      if (typeof prompt === 'symbol')
        return
    }
    else {
      prompt = args._.join(' ')
    }

    let locales = typeof args.locale === 'string' ? [args.locale] : args.locale || []
    locales = normalizeLocales(locales, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales

    const { withLocales, includeContext } = getWithLocales(args.with, i18n)
    const withLocaleJsons: Record<string, LocaleJson> = {}
    for (const locale of withLocales) {
      withLocaleJsons[locale] = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
    }

    if (withLocales.length > 0)
      console.log(ICONS.info, `With: ${withLocales.map(l => `**${l}**`).join(', ')}`)

    const keysToTranslate: Record<string, LocaleJson> = {}
    const keysToTranslateAndDefault: Record<string, LocaleJson> = {}
    const toOverwrite: string[] = []
    for (const locale of localesToCheck) {
      let localeJson: LocaleJson
      try {
        localeJson = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
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

      if (findNestedKey(localeJson, args.key).value !== undefined) {
        if (args.force) {
          toOverwrite.push(locale)
        }
        else {
          console.log(ICONS.info, `Skipped: **${locale}**`)
          continue
        }
      }

      if (locale !== i18n.default)
        keysToTranslate[locale] = { [args.key]: prompt }
      keysToTranslateAndDefault[locale] = { [args.key]: prompt }
    }

    if (toOverwrite.length > 0)
      console.log(ICONS.info, `Overwriting translation for locale${toOverwrite.length > 1 ? 's' : ''}: ${toOverwrite.map(l => `**${l}**`).join(', ')}`)

    if (args.debug)
      console.log(ICONS.info, `To translate: ${JSON.stringify(keysToTranslate)}`)

    if (Object.keys(keysToTranslateAndDefault).length > 0) {
      await console.loading(`Adding \`${args.key}\` to ${Object.keys(keysToTranslateAndDefault).map(l => `**${l}**`).join(', ')}`, async () => {
        const translations = Object.keys(keysToTranslate).length > 0
          ? await translateKeys(keysToTranslate, config, i18n, openai, withLocaleJsons, includeContext)
          : {}

        translations[i18n.default] = keysToTranslateAndDefault[i18n.default]

        if (args.debug)
          console.log(ICONS.info, `Translations: ${JSON.stringify(translations)}`)

        for (const [locale, newTranslations] of Object.entries(translations)) {
          const localeFilePath = r(`${locale}.json`, i18n)

          let existingTranslations = {}
          try {
            existingTranslations = JSON.parse(fs.readFileSync(localeFilePath, { encoding: 'utf8' }))
          }
          catch (error: any) {
            if (error.code !== 'ENOENT')
              throw error
          }

          const finalTranslations = mergeMissingTranslations(existingTranslations, newTranslations)

          fs.writeFileSync(localeFilePath, JSON.stringify(finalTranslations, null, 2), { encoding: 'utf8' })
        }
      })
    }
    else {
      console.log(ICONS.success, 'All locales are up to date.')
    }
  },
})
