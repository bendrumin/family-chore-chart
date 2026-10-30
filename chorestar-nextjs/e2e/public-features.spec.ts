import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'

/**
 * Signed-out pages that do something, not just show copy.
 *
 * /printable-chore-chart: the free chart maker. Picking an age fills in
 * starter chores, the PDF downloads with no account, and only then does the
 * "keep score for you" pitch appear.
 */
test.describe('printable chore chart', () => {
  test('fills chores by age and downloads a PDF without signing in', async ({ page }) => {
    await page.goto('/printable-chore-chart')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/free printable chore chart/i)

    const chores = page.getByRole('textbox', { name: /^Chore \d+$/ })
    await expect(chores.first()).not.toHaveValue('')
    const values = () => chores.evaluateAll((els) => els.map((el) => (el as HTMLInputElement).value))
    const forSeven = await values()

    await page.getByRole('button', { name: 'Ages 3 to 5' }).click()
    await expect(page.getByRole('button', { name: 'Ages 3 to 5' })).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(values).not.toEqual(forSeven)

    await page.getByLabel("Kid's name").fill('Maya')
    await page.getByRole('button', { name: 'Add a chore' }).click()
    await chores.last().fill('Feed the fish')
    await page.getByLabel('Show allowance per chore').check()
    await expect(page.getByRole('textbox', { name: /^Allowance for chore 1$/ })).toBeVisible()
    await page.getByRole('button', { name: 'Rainbow' }).click()

    await expect(page.getByRole('status')).toHaveCount(0)
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download the PDF' }).click(),
    ])
    expect(download.suggestedFilename()).toBe('chorestar-rainbow-maya.pdf')
    const pdf = readFileSync((await download.path())!)
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-')

    await expect(page.getByRole('status')).toContainText('Maya checks these off')
    await expect(page.getByRole('link', { name: 'Start free' }).first()).toHaveAttribute('href', '/signup')
  })

  test('Arabic and emoji print as real pictures of the text, and no name still reads right', async ({ page }) => {
    await page.goto('/printable-chore-chart')
    const chores = page.getByRole('textbox', { name: /^Chore \d+$/ })
    await expect(chores.first()).not.toHaveValue('')
    const download = async () => {
      const [file] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: 'Download the PDF' }).click(),
      ])
      return readFileSync((await file.path())!).toString('latin1')
    }

    const plain = await download()
    expect(plain).toContain('My Weekly Chore Chart')
    expect(plain).not.toContain("My's")
    expect(plain).not.toContain('/Subtype /Image')

    await page.getByLabel("Kid's name").fill('ليان')
    await chores.first().fill('🧹 ترتيب السرير')
    const arabic = await download()
    expect(arabic).toContain('/Subtype /Image')
    expect(arabic).not.toContain('þ')
  })

  test('will not make an empty chart', async ({ page }) => {
    await page.goto('/printable-chore-chart')
    const remove = page.getByRole('button', { name: /^Remove / })
    await expect(remove.first()).toBeVisible()
    while (await remove.count()) await remove.first().click()
    await page.getByRole('button', { name: 'Download the PDF' }).click()
    await expect(page.getByText('Add at least one chore first')).toBeVisible()
  })

  test('is in the sitemap and the footer', async ({ page, request }) => {
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('https://chorestar.app/printable-chore-chart')
    await page.goto('/faq')
    await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Free Printable Chore Chart' })).toHaveAttribute(
      'href',
      '/printable-chore-chart'
    )
  })
})
