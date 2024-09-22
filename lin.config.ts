import { defineConfig } from './src'

export default defineConfig({
  i18n: {
    locales: ['en-US', 'hu-HU', 'ko-KR'],
    defaultLocale: 'en-US',
    directory: './locales',
  },
})
