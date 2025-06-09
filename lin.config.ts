import { defineConfig } from './src'

export default defineConfig({
  i18n: {
    locales: ['en-US', 'hu-HU', 'ko-KR'],
    defaultLocale: 'en-US',
    directory: './locales',
  },
  options: {
    provider: 'groq',
    model: 'meta-llama/llama-4-maverick-17b-128e-instruct',
  },
})
