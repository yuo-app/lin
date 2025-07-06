import { defineConfig } from './src'

export default defineConfig({
  i18n: {
    locales: ['en-US', 'hu-HU', 'ko-KR'],
    defaultLocale: 'en-US',
    directory: './locales',
  },
  with: 'both',
  options: {
    provider: 'google',
    model: 'gemini-2.5-flash',
  },
  presets: {
    'grok': {
      provider: 'azure',
      model: 'grok-3',
      mode: 'json',
    },
    'ds': {
      provider: 'azure',
      model: 'DeepSeek-R1-0528',
      mode: 'custom',
    },
    'fast-ds': {
      provider: 'groq',
      model: 'deepseek-r1-distill-llama-70b',
    },
  },
})
