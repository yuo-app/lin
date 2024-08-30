# TODO

## v0.1.0

- [ ] **`translate [...locales]`**: sync all locale json files with the default locale json file.
  - [x] translates all locales, skip locales that exactly match the default locale
  - [ ] find missing keys in locales, add placeholder strings, get translations with one gpt request, put translations back to their correct places
  - [ ] if no locales are provided, then prompt the user to translate them
  - **options:**
    - [x] `-f, --force`: force to translate all locales

- [ ] **`add <key> [...text]`**: add a key (or more keys) to the default locale json file, and translate it to all the locales.
  - [ ] if key already exists, show error and prompt to use
  - **options:**
    - [ ] `-l, --locale <locale>`: translate only the specified locale
    - [ ] `-f, --force`: force to translate the key even if it already exists

- [ ] locales: `all` is every locale, `def` is the default locale, and `en` is a shorthand for `en-**`

- [ ] **`verify`**: check everything is setup correctly.

- [ ] **context window:** provide a way to add extra information to the gpt request
  - [ ] `context: string` config: this just gets added to the prompt by default
  - `-w, --with [locale]`
    - [ ] `string` commonarg: add a locale json to the prompt
    - [ ] `boolean` commonarg: do not add the context string to the prompt

- [ ] **`convert` command:** convert a project to use i18n by extracting all the strings from the code and adding them to the locale json files.
- [ ] i18n loader
- [ ] support for other i18n integrations
