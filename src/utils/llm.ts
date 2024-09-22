import type OpenAI from 'openai'
import type { Config } from '../config'
import type { I18nConfig } from '../i18n'
import type { DeepRequired } from '../types'
import { confirm } from '@clack/prompts'
import { console, formatLog, ICONS } from './console'
import { type LocaleJson, normalizeLocales } from './utils'

export function getWithLocales(withLocale: string | string[], i18n: I18nConfig) {
  const withArg = typeof withLocale === 'string' ? [withLocale] : withLocale || []
  const includeContext = !withArg.includes('')
  if (withArg.length <= 1)
    return { withLocales: [], includeContext }

  const withLocales = normalizeLocales(withArg, i18n)
  return { withLocales, includeContext }
}

export async function deletionGuard(keyCountsBefore: Record<string, number>, keyCountsAfter: Record<string, number>, locales: string[]): Promise<boolean> {
  console.logL(ICONS.result)
  const negativeDiffs: Record<string, number> = {}
  for (const [index, locale] of Object.keys(keyCountsBefore).entries()) {
    const diff = keyCountsAfter[locale] - keyCountsBefore[locale]

    const isLast = index === locales.length - 1
    if (Object.keys(keyCountsBefore).length === 1 || isLast)
      console.logL(`${locale} (${diff > 0 ? '+' : ''}${diff})`)
    else
      console.logL(`${locale} (${diff > 0 ? '+' : ''}${diff}), `)

    if (diff < 0)
      negativeDiffs[locale] = diff
  }
  console.log()

  if (Object.keys(negativeDiffs).length > 0) {
    const result = await confirm({
      message: formatLog(`${ICONS.warning} This will remove ${Object.keys(negativeDiffs).map(l => `\`${-negativeDiffs[l]}\``).join(', ')} keys from ${Object.keys(negativeDiffs).map(l => `**${l}**`).join(', ')}. Continue?`),
      initialValue: false,
    })
    if (typeof result !== 'boolean' || !result)
      return false
  }
  return true
}

export async function translateKeys(
  keysToTranslate: Record<string, LocaleJson>,
  config: DeepRequired<Config>,
  i18n: I18nConfig,
  openai: OpenAI,
  withLocaleJsons?: Record<string, LocaleJson>,
  includeContext?: boolean,
) {
  const completion = await openai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: `You are a translation API that translates locale JSON files. 
${includeContext && i18n.context ? `Additional information from user: ${i18n.context}` : ''}
For each locale, translate the values from the default locale (${i18n.defaultLocale}) language to the corresponding languages (denoted by the locale keys). 
Return a JSON object where each top key is a locale, and the value is an object containing the translations for that locale.
${withLocaleJsons ? `Other locale JSONs from the user's codebase for context: ${JSON.stringify(withLocaleJsons)}\nAlways use dot notation when dealing with nested keys:` : ''}
Example input:
{"fr-FR": {"ui.home.title": "Title"}}
Example output:
{"fr-FR": {"ui.home.title": "Titre"}}`,
      },
      {
        role: 'user',
        content: JSON.stringify(keysToTranslate),
      },
    ],
    ...config.options,
    response_format: { type: 'json_object' },
  })
  return JSON.parse(completion.choices[0].message.content || '{}') as Record<string, LocaleJson>
}
