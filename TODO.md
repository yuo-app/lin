# TODO

## v0.1.0

- [x] **`translate [...locales]`**: sync all locale json files with the default locale json file.
  - [x] translates all locales, skip locales that exactly match the default locale
  - [x] find missing keys in locales, add placeholder strings, get translations with one gpt request, put translations back to their correct places
  - **options:**
    - [x] `-f, --force`: force to translate all locales

- [x] **`add <key> [...text]`**: add a key to the default locale json file, and translate it to all the locales.
  - [x] known issue: doesn't create new locale json files if they don't exist
  - [x] USE THE SAME PROMPT AS `translate`
  - **options:**
    - [x] `-l, --locale <locale>`: translate only the specified locale
    - [x] `-f, --force`: force add key overriding existing ones

- [x] **`del <...keys>`**: delete keys from locales.
  - [x] `-l, --locale <locale>`: delete only from the specified locale

- [x] locales: `all` is every locale, `def` is the default locale, and `en` is a shorthand for `en-**`

- [x] **`tidy`**: check the setup, reorder locale json files alphabetically or to the default locale json (ordering can get messed up when using `add`), it can also be a quick way to check if all locals have the same shape (or the translate command is needed)

- [x] llm protection: show key counts before and after the add or translate commands. they shouldn't remove keys under any circumstances, so prompt the user for confirmation.

- [x] **context window:** provide a way to add extra information to the gpt request
  - [x] `context: string` config: this just gets added to the prompt by default
  - `-w, --with [locale]`
    - [x] `string` commonarg: add a locale json to the prompt
    - [x] `boolean` commonarg: do not add the context string to the prompt

- [x] i18n loader

### v0.2.0

- [ ] setup command to add i18n to new projects
- [ ] support a ton of i18n frameworks
- [ ] validate config (like locales, models, etc) with checkArg
- [ ] **`verify`**: reflect on the quality of the translations, check if the translations are accurate
- [ ] **`convert` command:** convert a project to use i18n by extracting all the strings from the code and adding them to the locale json files.
- [ ] support claude and friends (what's the best way to support them all??)
