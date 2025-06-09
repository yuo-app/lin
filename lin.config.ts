import { defineConfig } from './src'

export default defineConfig({
  i18n: {
    locales: ['en-US', 'hu-HU', 'ko-KR'],
    defaultLocale: 'en-US',
    directory: './locales',
  },
  options: {
    // provider: 'groq',
    // model: 'deepseek-r1-distill-llama-70b',

    provider: 'google',
    model: 'gemini-2.5-flash-preview-05-20',

    // provider: 'azure',
    // model: 'grok-3-mini',
    // mode: 'json',
  },
})
