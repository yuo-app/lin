<script lang='ts'>
  import type { PageProps } from './$types'
  import { Button } from '$lib/components/ui/button'
  import { test } from '$lib/database/schema'
  import i18n from '$lib/i18n.svelte'

  const { t } = i18n

  const { data }: PageProps = $props()
  const database = data.database
  let records = $state(data.records || [])

  async function testInsert() {
    await database.insert(test).values({
      test: Date.now().toString(),
    })
    records = await database.query.test.findMany()
  }

  async function purge() {
    await database.delete(test).all()
    records.length = 0
  }

  function toggleLocale() {
    console.warn('Current locale:', i18n.locale)
    i18n.setLocale(i18n.locale === 'en-US' ? 'hu-HU' : 'en-US')
    console.warn('Locale changed to:', i18n.locale)
  }
</script>

<h1 class='pb-2 pt-6 text-center text-4xl font-bold'>Organized</h1>
<div class='m-5 flex flex-col gap-5'>
  <div class='flex flex-col gap-2'>
    <Button class='w-full' onclick={testInsert}>
      <div class='i-fluent:add-square-16-filled size-4'></div>
      {t('insertButton', 'Add record')}
    </Button>
    <Button class='w-full' onclick={purge}>
      <div class='i-fluent:delete-16-filled size-4'></div>
      {t('purgeButton', 'Purge')}
    </Button>
    <Button class='w-full' onclick={toggleLocale}>
      {i18n.t('toggleLang', 'Toggle language')}
    </Button>
  </div>

  <div class='flex flex-col gap-2'>
    <p>
      {i18n.t('testKey', 'Test')}
    </p>
    <p>
      {t('testKey2', 'Test2')}
    </p>
    {#each records as record (record.id)}
      <p>{record.test}</p>
    {/each}
  </div>
</div>