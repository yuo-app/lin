<h1 align="center">lin</h1>
<p align="center">
  <code>lin</code> is a CLI tool that translates locale JSONs with GPT (currently).
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

`lin` needs to know 3 things to work:

- **locales**: an array of locales to translate
- **defaultLocale**: the default from the locales array
- **directory**: the folder with the locale JSON files

Create an `i18n.config.ts` (or js, json, etc, see [Config](#config)) file in the root of your project:

```ts
import { defineConfig } from '@yuo-app/lin'

export default defineConfig({
  locales: ['en-US', 'es-ES'],
  defaultLocale: 'en-US',
  directory: 'locales',
})
```

> [!IMPORTANT]
> `lin` will be able to infer all these from your existing i18n setup.

## usage

> [!TIP]
> Run `lin -h` and `lin <command> -h` to see all the options.

### translate

The **translate** command syncs all locale JSON files with the default locale JSON file. It finds the missing keys in locales, and translates them with one GPT request.

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

`add` can be useful when writing a new part of the UI. You can use it to quickly add a new key to the default locale and translate it to all the locales.

```bash
lin add ui.button.save Text of the save button
```

`ui.button.save` will be the key inserted to the JSONs, and the rest of the arguments will be the value ie. the translated text.

> [!NOTE]
> if the key is nested, it should be in dot notation like `ui.button.save`

To add a key to a specific locale, use the `-l` flag:

```bash
lin add -l ko ui.button.save Text of the save button
```

Listing multiple locales is done by using the `-l` flag multiple times:

```bash
lin add ui.button.save -l jp Text of the save button -l zh
```

(flags can be all over the place, but their values stop at the first space)

For adding more keys, it's usually best to just directly edit the default JSON and then use `lin translate` to translate them. But `translate` does not remove keys, so `del` is needed for that.

### del

`del` just removes keys from the locale JSON files.

```bash
lin del nav.title footer.description
```

### tidy

`tidy` provides a quick way to check everything is set up correctly; it prints info about the locales.

```bash
lin tidy
```

You can also use it to sort the locale JSONs which can happen as `translate` and `add` don't keep the order.

To sort alphabetically:

```bash
lin tidy abc
```

To sort with respect to the default locale:

```bash
lin tidy def
```

## config

> [!TIP]
> All properties in the config can be used as CLI flags too.

### config file

Use only one config file.

#### lin config

- `lin.config.ts`

<details>
<summary>Show all</summary>

- `lin.config.{ts, mts, cts, js, mjs, cjs, json, ∅}`
- `.linrc.{ts, mts, cts, js, mjs, cjs, json, ∅}`
- `lin` in `package.json`
- `lin` in your vite or nuxt config

</details>

#### i18n config

- `i18n.config.ts` or `i18n` in `lin.config.ts`

<details>
<summary>Show all</summary>

- `i18n` in lin config
- `i18n.config.{ts, mts, cts, js, mjs, cjs, json, ∅}`
- `.i18nrc.{ts, mts, cts, js, mjs, cjs, json, ∅}`
- `lin.i18n` in `package.json`
- `lin.i18n` in your vite or nuxt config

</details>

### LLM config

*for the `add` and `translate` commands*

`lin` uses the Vercel AI SDK to support multiple LLM providers. You need to specify the model in the format `provider:model_id` (e.g., `openai:gpt-4.1-mini`) in your configuration or via the `--model` CLI flag. Make sure the corresponding API key (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) is set in your environment variables.

The LLM options (ex. temperature) are exposed directly in `options` in the lin config.

#### `context` in config

This simple string is directly added to the system prompt. Use it to provide extra information to the LLM about your project.

```ts
context: 'hello gpt friend, how do you do'
```

#### `with` arg

You can use this flag with locales to add them to the context window.
This will add the entire ja-JP.json file to the LLM.

```bash
lin translate zh -w jp
```
