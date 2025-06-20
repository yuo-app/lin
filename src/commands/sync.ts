import type { LocaleJson } from '@/utils'
import fs from 'node:fs'
import { defineCommand } from 'citty'
import { allArgs, resolveConfig } from '@/config'
import {
  catchError,
  console,
  countKeys,
  deletionGuard,
  findMissingKeys,
  ICONS,
  mergeMissingTranslations,
  normalizeLocales,
  r,
  resolveContextLocales,
  shapeMatches,
  translateKeys,
} from '@/utils'
import { saveUndoState } from '@/utils/undo'

export default defineCommand({
  meta: {
    name: 'sync',
    description: 'sync locales',
  },
  args: {
    ...allArgs,
    locale: {
      type: 'positional',
      description: 'the locales to sync',
      required: false,
      valueHint: 'all | def | en | en-US',
    },
    force: {
      alias: 'f',
      type: 'boolean',
      description: 'ignore checks and sync the whole locale json',
      default: false,
    },
    silent: {
      alias: 'S',
      type: 'boolean',
      description: 'show minimal, script-friendly output',
      default: false,
    },
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const i18n = config.i18n
    const batchSize = config.batchSize || Number.POSITIVE_INFINITY

    const locales = catchError(normalizeLocales)(args._, i18n)
    const localesToCheck = locales.length > 0 ? locales : i18n.locales.filter(l => l !== i18n.defaultLocale)
    const defaultLocaleJson = JSON.parse(fs.readFileSync(r(`${i18n.defaultLocale}.json`, i18n), { encoding: 'utf8' }))

    const withOption = args.with !== undefined ? args.with : config.with

    const keyCountsBefore: Record<string, number> = {}
    const keyCountsAfter: Record<string, number> = {}
    const translationsToWrite: Record<string, LocaleJson> = {}

    const localeBatches: string[][] = []
    if (batchSize > 0) {
      for (let i = 0; i < localesToCheck.length; i += batchSize)
        localeBatches.push(localesToCheck.slice(i, i + batchSize))
    }
    else {
      localeBatches.push(localesToCheck)
    }

    for (const batch of localeBatches) {
      const withLocales = resolveContextLocales(withOption as any, i18n, batch)
      const withLocaleJsons: Record<string, LocaleJson> = {}
      for (const locale of withLocales) {
        try {
          withLocaleJsons[locale] = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
        }
        catch (error: any) {
          if (config.debug) {
            if (error.code === 'ENOENT')
              console.log(ICONS.info, `Skipping context for **${locale}** *(file not found)*`)
            else
              console.log(ICONS.warning, `Could not read or parse context file for locale **${locale}**. Skipping.`)
          }
        }
      }

      const loadedContextLocales = Object.keys(withLocaleJsons)
      if (loadedContextLocales.length > 0 && !args.silent)
        console.log(ICONS.info, `With: ${loadedContextLocales.map(l => `**${l}**`).join(', ')}`)

      const keysToTranslate: Record<string, LocaleJson> = {}
      for (const locale of batch) {
        if (args.force) {
          keysToTranslate[locale] = defaultLocaleJson
          if (!args.silent)
            console.log(ICONS.info, `Force syncing entire JSON for locale: **${locale}**`)
        }
        else {
          let localeJson
          try {
            localeJson = JSON.parse(fs.readFileSync(r(`${locale}.json`, i18n), { encoding: 'utf8' }))
          }
          catch (error: any) {
            if (error.code === 'ENOENT') {
              if (!args.silent)
                console.log(ICONS.warning, `File not found for locale **${locale}**. Creating a new one.`)
              localeJson = {}
            }
            else {
              throw error
            }
          }

          if (shapeMatches(defaultLocaleJson, localeJson)) {
            if (!args.silent)
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
        console.log(ICONS.info, `To sync: ${JSON.stringify(keysToTranslate)}`)

      if (!args.silent && batch.length > 0)
        console.log(ICONS.note, `Keys: ${countKeys(defaultLocaleJson)}`)

      if (Object.keys(keysToTranslate).length > 0) {
        const syncTask = async () => {
          const translations = await translateKeys(keysToTranslate, config, i18n, withLocaleJsons)

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
            translationsToWrite[localeFilePath] = finalTranslations
          }
        }
        if (args.silent)
          await syncTask()
        else
          await console.loading(`Syncing ${args.force ? 'entire JSON' : 'missing keys'} for ${Object.keys(keysToTranslate).map(l => `**${l}**`).join(', ')}`, syncTask)
      }
    }

    const result = await deletionGuard(keyCountsBefore, keyCountsAfter, locales, args.silent)
    if (!result)
      return

    if (Object.keys(translationsToWrite).length > 0) {
      saveUndoState(Object.keys(translationsToWrite), config as any)
      for (const localePath of Object.keys(translationsToWrite))
        fs.writeFileSync(localePath, `${JSON.stringify(translationsToWrite[localePath], null, 2)}\n`, { encoding: 'utf8' })
    }
    else if (args.silent) {
      console.log('All locales are up to date.')
    }
    else if (!args.silent) {
      console.log(ICONS.success, 'All locales are up to date.')
    }
  },
})
