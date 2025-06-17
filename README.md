<h1 align="center">lin</h1>
<p align="center">
  <code>lin</code> is a CLI tool that translates locale JSONs using LLMs
</p>

[![NPM Version](https://img.shields.io/npm/v/%40yuo-app%2Flin?color=red)](https://www.npmjs.com/package/%40yuo-app%2Flin)
[![JSR Version](https://img.shields.io/jsr/v/%40yuo/lin?color=yellow)](https://jsr.io/%40yuo/lin)

## get started

### install

```bash
npm i -D @yuo-app/lin
```

or use `-g` to install globally for non-npm projects.

### setup

You will need:

- a project with i18n set up
- a default locale JSON file (e.g. `en-US.json`)
- API keys for your chosen LLM providers in your .env file (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`)

See [LLM Config](#llm-config).

`lin` will try to automatically detect your i18n configuration from your existing project setup. It supports:

- i18next (`i18next-parser.config.js`)
- Next.js (`next.config.js`)
- Nuxt.js (`nuxt.config.js`)
- Vue I18n (`vue.config.js`)
- Angular (`angular.json`)
- Svelte (`svelte.config.js`)
- Ember.js (`ember-cli-build.js`)
- Gatsby (`gatsby-config.js`)
- Solid.js (`vite.config.js`)
- Qwik (`vite.config.js` or `package.json`)
- Astro (`astro.config.mjs` or `astro-i18next.config.mjs`)
- Remix (`package.json`)

If your setup is not detected automatically, you can specify the integration with using the `integration` config, and `lin` will only load the specified framework.

Or you can create a `lin.config.ts` (or `i18n.config.ts` root) to tell `lin` about your i18n setup:

- **locales**: an array of locales to translate
- **defaultLocale**: the default from the locales array
- **directory**: the folder with the locale JSON files

Example `lin.config.ts`:

```ts
import { defineConfig } from '@yuo-app/lin'

export default defineConfig({
  i18n: {
    locales: ['en-US', 'es-ES'],
    defaultLocale: 'en-US',
    directory: 'locales',
  }
})
```

## usage

> [!TIP]
> Run `lin -h` and `lin <command> -h` to see all the options.

### translate

The **translate** command syncs all locale JSON files with the default locale JSON file. It finds the missing keys in locales, and translates them.

```bash
lin translate
```

To translate only specific locales, list them like this:

```bash
lin translate es fr
```

You can also use the `translate` command to **add a new language**.

1. First add the locale code to `locales` in the i18n config
2. Then run `lin translate` and it will create the new locale JSON file

> [!NOTE]
> There is some syntax around **locale codes**:
>
> - locale JSONs should be named with the full locale code (e.g. `en-US.json`): lanugage code 2 characters, country code 2 characters
> - in commands - just like above - you can use the first 2 letters as a shorthand (e.g. `en` to match en-**)
> - `all` is a special keyword that matches all locales
> - `def` means the default locale from the config

### add

`add` can be useful when writing a new part of the UI. You can use it to quickly add a new key to the default locale and translate it to all the other locales.

```bash
lin add ui.button.save Text of the save button
```

`ui.button.save` will be the key, and `Text of the save button` will be the value for the default locale. This will then be translated to all other locales.

> [!NOTE]
> if the key is nested, it should be in dot notation like `ui.button.save`

To add a key to only specific locales, use the `-l` flag. You can repeat it for multiple locales.

```bash
lin add -l es -l fr ui.button.save Text of the save button
```

This will add the key to `es` and `fr` locales (and the default locale).

> [!TIP]
> The `add`, `edit`, and `del` commands support key suggestions. If you're not sure about a key, try one of these:
>
> - End your key with a dot to see all available sub-keys (e.g., `lin del ui.button.`).
> - Type the beginning of a key to get suggestions for matching keys (e.g., `lin edit ui.but`).
>
> `lin add ui.b` will show suggestions, but if you really want to add an empty key, use an empty string: `lin add ui.b ""`

### edit

`edit` can be used to quickly edit an existing key in the default locale and all the other locales.

```bash
lin edit ui.button.save Text of the save button
```

To edit a key in only specific locales, use the `-l` flag. You can repeat it for multiple locales.

```bash
lin edit -l es -l fr ui.button.save Text of the save button
```

### del

`del` removes keys from the locale JSON files.

```bash
lin del nav.title footer.description
```

### tidy

`tidy` provides a quick way to check everything is set up correctly; it prints info about the locales.

```bash
lin tidy
```

You can also use it to sort the locale JSONs alphabetically or with respect to the default locale.

```bash
lin tidy abc # sort alphabetically
lin tidy def # sort by default locale
```

### undo

`undo` reverts the last changes made by `add`, `del`, `tidy`, or `translate`.

```bash
lin undo
```

### models

To see a list of all available LLM providers and models:

- Run `lin -M`, `lin --models` or `lin models` to list all models.
- To filter by provider, just specify providers after the command: `lin -M openai google`

## config

> [!TIP]
> All properties in the config can be used as CLI flags too.

`lin` automatically saves a backup of any files modified by the `add`, `del`, `tidy`, and `translate` commands. You can disable this feature with the `--no-undo` flag, or by setting `undo: false` in your config file.

> [!IMPORTANT]
> Add the `.lin` directory to your `.gitignore` file.

### config file

`lin` uses `unconfig` to find and load your configuration files. You can use one of the following:

- `lin.config.ts` (or `.js`, `.mjs`, etc.)
- `.linrc` (or with extension, or `.json`)
- `lin` property in `package.json`
If you are not using one of the auto-detected frameworks, you can put your i18n config inside your `lin` config, or create a separate `i18n.config.ts` file.

See [`src/config/i18n.ts`](./src/config/i18n.ts) for a full list of configuration sources.

### LLM config

*for the `add` and `translate` commands*

`lin` uses the [Vercel AI SDK](https://sdk.vercel.ai/) to support multiple LLM providers. The currently supported providers are:

- `openai`
- `anthropic`
- `google`
- `xai`
- `mistral`
- `groq`
- `azure`

You need to specify the model in your configuration or via the `--model` CLI flag. The format is `provider:model_id` (e.g., `openai:gpt-4.1-mini`).

Make sure the corresponding API key is set in your environment variables (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`).

Example `lin.config.ts` with LLM options:

```ts
import { defineConfig } from '@yuo-app/lin'

export default defineConfig({
  // ... i18n config
  options: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
    temperature: 0.7,
  }
})
```

All options under `options` are passed to the Vercel AI SDK.

#### `presets` in config

To avoid long CLI commands, you can define and name different model configurations in your `lin.config.ts` file.

```ts
// lin.config.ts
export default defineConfig({
  options: {
    provider: 'openai',
    model: 'gpt-4.1-mini',
  },
  presets: {
    'creative-claude': {
      provider: 'anthropic',
      model: 'claude-sonnet-4-0',
      temperature: 0.8,
      context: 'You are a creative assistant who helps with translating my codebase.'
    },
    'fast-deepseek': {
      provider: 'groq',
      model: 'deepseek-r1-distill-llama-70b',
    },
  }
})
```

You can then activate a preset using the `--model` flag. Any other CLI flags will override the preset's values.

```bash
# Use the 'creative-claude' preset
lin translate -m creative-claude

# Use the 'fast-deepseek' preset, but override the temperature
lin add ui.new.feature "A new feature" -m fast-deepseek -t 0.6
```

#### `context` in config

This simple string is directly added to the system prompt. Use it to provide extra information to the LLM about your project.
