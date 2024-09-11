import 'dotenv/config'
import process from 'node:process'
import fs from 'node:fs/promises'
import { defineCommand } from 'citty'
import { text } from '@clack/prompts'
import OpenAI from 'openai'
import { loadI18nConfig } from '../i18n'
import { commonArgs, resolveConfig } from '../config'
import {
  r,
  setNestedKey,
} from '../utils'

export default defineCommand({
  meta: {
    name: 'add',
    description: 'add a key to the locales with all the translations',
  },
  args: {
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
    ...commonArgs,
  },
  async run({ args }) {
    const { config } = await resolveConfig(args)
    const i18n = loadI18nConfig()

    if (args._.length === 0) {
      console.error('Please provide a key to add')
      return
    }

    const key = args._[0] // a.b.c
    args._.shift()
    let prompt

    if (args._.length === 0) {
      prompt = await text({
        message: `Enter ${i18n.default} translation for key ${key}`,
        placeholder: 'Press [ENTER] to skip',
      })
    }
    else {
      prompt = args._.join(' ')
    }

    const locales = [i18n.default, ...i18n.locales]

    for (const l of locales) {
      const localeFilePath = r(`${l}.json`, i18n)
      const locale = JSON.parse(await fs.readFile(localeFilePath, { encoding: 'utf8' }))

      let translation = prompt

      const openai = new OpenAI({ apiKey: process.env[config.env] })
      if (l !== i18n.default) {
        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are a simple translator API that translates text from ${i18n.default} to ${l}. More working, less yapping.`,
            },
            {
              role: 'user',
              content: prompt as string,
            },
          ],
          ...config.options,
          response_format: { type: 'text' },
        })
        const content = completion.choices[0].message.content
        if (typeof content !== 'string')
          throw new Error('Error while translating text')
        translation = content
      }

      setNestedKey(locale, key, translation)
      await fs.writeFile(localeFilePath, JSON.stringify(locale, null, 2), { encoding: 'utf8' })
    }
  },
})
