// @ts-check
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'

export default defineConfig({
  integrations: [
    starlight({
      title: 'lin',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/yuo-app/lin' }],
      customCss: ['@fontsource/inter/400.css', '@fontsource/inter/600.css', './src/styles/custom.css'],
      sidebar: [
        {
          label: 'Guides',
          items: [
            { label: 'Getting Started', link: '/guides/getting-started/' },
            { label: 'Your First Translation', link: '/guides/first-translation/' },
            { label: 'CI/CD Automation', link: '/guides/ci-cd/' },
            { label: 'Programmatic Usage', link: '/guides/programmatic-usage/' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'Commands', link: '/reference/commands/' },
            { label: 'Configuration', link: '/reference/configuration/' },
          ],
        },
        {
          label: 'Frameworks',
          items: [
            { label: 'Integrations', link: '/frameworks/' },
            { label: 'Svelte', link: '/frameworks/svelte/' },
          ],
        },
      ],
    }),
  ],
})
