import { expect, test } from '@playwright/test'

async function configureBasicQuiz(page: import('@playwright/test').Page) {
	await page.goto('/')
	await page.getByRole('radio', { name: 'Addisjon' }).check()
	await page.locator('label[for="l-1"]').click()
}

test('can start quiz and abort back to menu', async ({ page }) => {
	await configureBasicQuiz(page)

	await page.getByRole('button', { name: 'Start' }).click()
	await expect(page.getByText('Gjør deg klar ...')).toBeVisible()
	await expect(page.getByText('Oppgave 1')).toBeVisible({ timeout: 7000 })

	await page.getByRole('button', { name: /Åpne avsluttvalg|Angre/ }).click()
	await page.getByRole('button', { name: 'Ja' }).click()

	await expect(page.getByText('Velg regneart')).toBeVisible()
})

test('can open share panel from settings', async ({ page }) => {
	await configureBasicQuiz(page)

	await page.getByRole('button', { name: 'Del' }).click()

	await expect(page.getByText('Deling')).toBeVisible()
	await expect(page.getByLabel('Tittel')).toBeVisible()
})
