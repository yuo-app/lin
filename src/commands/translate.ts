import fs from 'node:fs'
import process from 'node:process'
import { confirm } from '@clack/prompts'
import { defineCommand } from 'citty'
import OpenAI from 'openai'
import c from 'picocolors'
import { commonArgs, resolveConfig } from '../config'
import { loadI18nConfig } from '../i18n'
import {
  console,
  countKeys,
  findMissingKeys,
  getWithLocales,
  ICONS,
  type LocaleJson,
  mergeMissingTranslations,
  normalizeLocales,
  r,
  shapeMatches,
  translateKeys,
} from '../utils'

export default defineCommand({
  meta: {
    name: 'translate',
    description: 'translate locales',
  },
  args: {
    locale: {
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

    const locales = normalizeLocales(args._, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales.filter(l => l !== i18n.default)
    const defaultLocaleJson = JSON.parse(fs.readFileSync(r(`${i18n.default}.json`, i18n), { encoding: 'utf8' }))

    const { withLocales, includeContext } = getWithLocales(args, i18n)
    const withLocaleJsons: Record<string, LocaleJson> = {}
    for (const locale of withLocales) {
      withLocaleJsons[locale] = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
    }

    if (withLocales.length > 0)
      console.log(ICONS.info, `With: ${withLocales.map(l => `**${l}**`).join(', ')}`)

    const keyCountsBefore: Record<string, number> = {}
    const keyCountsAfter: Record<string, number> = {}
    const keysToTranslate: Record<string, LocaleJson> = {}
    const translationsToWrite: Record<string, LocaleJson> = {}
    for (const locale of localesToCheck) {
      if (args.force) {
        keysToTranslate[locale] = defaultLocaleJson
        console.log(ICONS.info, `Force translating entire JSON for locale: **${locale}**`)
      }
      else {
        let localeJson
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

        if (shapeMatches(defaultLocaleJson, localeJson)) {
          console.log(ICONS.info, `Skipped: **${locale}**`)
          continue
        }

        const missingKeys = findMissingKeys(defaultLocaleJson, localeJson)
        if (Object.keys(missingKeys).length > 0) {
          keysToTranslate[locale] = missingKeys
          keyCountsBefore[locale] = countKeys(localeJson)
        }
      }
    }

    if (args.debug)
      console.log(ICONS.info, `To translate: ${JSON.stringify(keysToTranslate)}`)

    console.log(ICONS.note, `Keys: ${countKeys(defaultLocaleJson)}`)

    if (Object.keys(keysToTranslate).length > 0) {
      await console.loading(`Translating ${args.force ? 'entire JSON' : 'missing keys'} for ${Object.keys(keysToTranslate).map(l => `**${l}**`).join(', ')}`, async () => {
        const translations = await translateKeys(keysToTranslate, config, i18n, openai, withLocaleJsons, includeContext)

        if (args.debug)
          console.log(ICONS.info, `Translations: ${JSON.stringify(translations)}`)

        for (const [locale, newTranslations] of Object.entries(translations)) {
          const localeFilePath = r(`${locale}.json`, i18n)
          let finalTranslations: LocaleJson

          if (args.force) {
            finalTranslations = newTranslations
          }
          else {
            let existingTranslations = {}
            try {
              existingTranslations = JSON.parse(fs.readFileSync(localeFilePath, { encoding: 'utf8' }))
            }
            catch (error: any) {
              if (error.code !== 'ENOENT')
                throw error
            }
            finalTranslations = mergeMissingTranslations(existingTranslations, newTranslations)
          }

          keyCountsAfter[locale] = countKeys(finalTranslations)
          // fs.writeFileSync(localeFilePath, JSON.stringify(finalTranslations, null, 2), { encoding: 'utf8' })
          translationsToWrite[localeFilePath] = finalTranslations
        }
      })

      console.logL(ICONS.result)
      let shouldContinue = false
      for (const locale of Object.keys(keyCountsBefore)) {
        const diff = keyCountsAfter[locale] - keyCountsBefore[locale]

        if (diff > 0) {
          if (Object.keys(keyCountsBefore).length === 1)
            console.logL(`${locale} (+${diff})`)
          else
            console.logL(`${locale} (+${diff}), `)
        }
        else if (diff < 0 && shouldContinue) {
          const result = await confirm({
            message: (ICONS.error, `This will remove ${-diff} keys from ${locale}. Continue?`),
            initialValue: false,
          })
          if (typeof result === 'boolean' && result)
            shouldContinue = true
          else
            return
        }
      }
      console.logL('\n')

      for (const localePath of Object.keys(translationsToWrite)) {
        fs.writeFileSync(localePath, JSON.stringify(translationsToWrite[localePath], null, 2), { encoding: 'utf8' })
      }
    }
    else {
      console.log(ICONS.success, 'All locales are up to date.')
    }
  },
})
