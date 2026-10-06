import { expect, test, type Page } from '@playwright/test'
import { waitForApp, waitForSettingsRouteHydration } from './e2eHelpers'

async function readRootThemeState(page: Page) {
	return page.evaluate(() => {
		const root = document.documentElement
		const computed = getComputedStyle(root)
		return {
			isDark: root.classList.contains('dark'),
			backgroundImage: computed.backgroundImage
		}
	})
}

async function readThemeVisualContract(page: Page) {
	return page.evaluate(() => {
		const panel = document.querySelector<HTMLElement>(
			'#main-content [data-panel-surface]'
		)
		const selectedRadio = document.querySelector<HTMLInputElement>(
			'input[type="radio"]:checked'
		)
		if (panel === null || selectedRadio === null) {
			return { problem: 'missing-panel-or-selected-radio' } as const
		}

		return {
			borderColor: getComputedStyle(panel).borderTopColor,
			radioBackgroundColor: getComputedStyle(selectedRadio).backgroundColor
		}
	})
}

async function readContentPanelBorderColor(page: Page) {
	return page.evaluate(() => {
		const panel = document.querySelector<HTMLElement>(
			'#main-content [data-panel-surface]'
		)
		return panel === null ? null : getComputedStyle(panel).borderTopColor
	})
}

async function readRenderedBackground(page: Page) {
	const image = await page.screenshot({ scale: 'css', caret: 'initial' })
	return page.evaluate(async (base64) => {
		const bitmap = await createImageBitmap(
			new Blob([Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))], {
				type: 'image/png'
			})
		)
		const canvas = document.createElement('canvas')
		canvas.width = canvas.height = 1
		const context = canvas.getContext('2d')
		if (context === null) throw new Error('Cannot read rendered theme pixel')
		context.drawImage(bitmap, 5, 200, 1, 1, 0, 0, 1, 1)
		bitmap.close()
		return Array.from(context.getImageData(0, 0, 1, 1).data)
	}, image.toString('base64'))
}

async function readLiveThemeColors(page: Page) {
	return page.evaluate(() => {
		const panel = document.querySelector('[data-panel-surface]')
		if (panel === null) throw new Error('Missing theme panel')
		const canvas = document.createElement('canvas')
		canvas.width = canvas.height = 1
		const context = canvas.getContext('2d')
		if (context === null) throw new Error('Cannot measure theme colors')
		return [
			getComputedStyle(document.documentElement).getPropertyValue(
				'--color-page-gradient-start'
			),
			getComputedStyle(panel).backgroundColor,
			getComputedStyle(panel).color
		].map((color) => {
			context.clearRect(0, 0, 1, 1)
			context.fillStyle = color
			context.fillRect(0, 0, 1, 1)
			return Array.from(context.getImageData(0, 0, 1, 1).data)
		})
	})
}

/**
 * Lists every opacity failure among the three samples, and every RGB channel
 * where `middle` does not sit more than 10 inside the `start`–`end` range.
 */
function findInterpolationProblems(
	label: string,
	start: number[],
	middle: number[],
	end: number[]
): string[] {
	const problems: string[] = []
	for (const [name, sample] of [
		['start', start],
		['middle', middle],
		['end', end]
	] as const) {
		if (sample[3] !== 255) {
			problems.push(`${label} ${name} alpha is ${String(sample[3])}`)
		}
	}
	for (const channel of [0, 1, 2]) {
		const low = Math.min(start[channel]!, end[channel]!) + 10
		const high = Math.max(start[channel]!, end[channel]!) - 10
		const value = middle[channel]!
		if (!(value > low && value < high)) {
			problems.push(
				`${label} channel ${channel} is ${value}, outside (${low}, ${high})`
			)
		}
	}
	return problems
}

async function pauseThemeColorTransitions(page: Page) {
	return page.evaluate(() => {
		const transitions = document.getAnimations().filter((animation) => {
			const effect = animation.effect
			return (
				animation instanceof CSSTransition &&
				effect instanceof KeyframeEffect &&
				effect.target === document.documentElement &&
				animation.transitionProperty.startsWith('--color-')
			)
		})

		if (
			transitions.some(
				(transition) =>
					Number(transition.currentTime) <
					Number(transition.effect?.getTiming().duration) * 0.3
			)
		)
			return 0

		for (const transition of transitions) transition.pause()
		return transitions.length
	})
}

async function finishThemeColorTransitions(page: Page) {
	return page.evaluate(() => {
		for (const animation of document.getAnimations()) {
			if (
				animation instanceof CSSTransition &&
				animation.effect instanceof KeyframeEffect &&
				animation.effect.target === document.documentElement &&
				animation.transitionProperty.startsWith('--color-')
			)
				animation.finish()
		}
	})
}

test.describe('theme switching', () => {
	test('updates root gradient immediately after post-hydration theme toggles', async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' })
		await page.goto('/')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		await expect
			.poll(async () => (await readRootThemeState(page)).isDark)
			.toBe(true)

		await page.getByTestId('settings-theme-light').check()

		await expect
			.poll(async () => (await readRootThemeState(page)).isDark)
			.toBe(false)
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(231, 229, 228)')
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(214, 211, 209)')

		await page.getByTestId('settings-theme-dark').check()

		await expect
			.poll(async () => (await readRootThemeState(page)).isDark)
			.toBe(true)
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(41, 37, 36)')
		await expect
			.poll(async () => (await readRootThemeState(page)).backgroundImage)
			.toContain('rgb(28, 25, 23)')
	})

	test('preserves dark panel and selected radio colors after a theme transition', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)
		await page.getByTestId('btn-global-settings').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		await page.getByTestId('settings-theme-dark').check()
		await expect
			.poll(async () => (await readRootThemeState(page)).isDark)
			.toBe(true)
		await expect
			.poll(async () => readContentPanelBorderColor(page))
			.toBe('rgb(68, 64, 60)')

		const visualContract = await readThemeVisualContract(page)
		if ('problem' in visualContract) throw new Error(visualContract.problem)

		expect(visualContract.borderColor).toBe('rgb(68, 64, 60)')
		expect(visualContract.radioBackgroundColor).toBe('rgb(3, 105, 161)')
	})

	test('interpolates live theme colors in both directions', async ({
		page,
		browserName
	}) => {
		await page.emulateMedia({
			colorScheme: 'light',
			reducedMotion: 'no-preference'
		})
		await page.goto('/settings')
		await waitForSettingsRouteHydration(page)
		await page.evaluate(() => {
			document.documentElement.style.setProperty('--theme-transition-ms', '2s')
		})

		const problems: string[] = []

		for (const theme of ['dark', 'light']) {
			const liveBefore = await readLiveThemeColors(page)
			const before = await readRenderedBackground(page)
			await page.getByTestId(`settings-theme-${theme}`).check()
			await expect
				.poll(() => pauseThemeColorTransitions(page))
				.toBeGreaterThan(0)
			await page.evaluate(
				() =>
					new Promise<void>((resolve) => {
						requestAnimationFrame(() => {
							requestAnimationFrame(() => {
								resolve()
							})
						})
					})
			)
			const liveMidpoint = await readLiveThemeColors(page)
			// WebKit screenshot capture resets active registered-property transitions.
			const midpoint =
				browserName === 'webkit' ? null : await readRenderedBackground(page)
			await finishThemeColorTransitions(page)
			await expect.poll(() => pauseThemeColorTransitions(page)).toBe(0)
			const after = await readRenderedBackground(page)
			const liveAfter = await readLiveThemeColors(page)
			for (const [index, middle] of liveMidpoint.entries()) {
				problems.push(
					...findInterpolationProblems(
						`${theme} live color ${index}`,
						liveBefore[index]!,
						middle,
						liveAfter[index]!
					)
				)
			}

			if (midpoint === null) {
				for (const [name, sample] of [
					['before', before],
					['after', after]
				] as const) {
					if (sample[3] !== 255) {
						problems.push(
							`${theme} rendered ${name} alpha is ${String(sample[3])}`
						)
					}
				}
				continue
			}
			problems.push(
				...findInterpolationProblems(
					`${theme} rendered background`,
					before,
					midpoint,
					after
				)
			)
			for (const channel of [0, 1, 2]) {
				const distance = Math.abs(before[channel]! - after[channel]!)
				if (distance <= 100) {
					problems.push(
						`${theme} rendered channel ${channel} only changes by ${distance}`
					)
				}
			}
		}

		expect(problems).toEqual([])
	})

	test('does not animate theme colors with reduced motion', async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' })
		await page.goto('/settings')
		await waitForSettingsRouteHydration(page)
		await page.getByTestId('settings-theme-dark').check()
		await expect(page.locator('html')).toHaveClass(/dark/)
		expect(
			await page.evaluate(
				() =>
					document
						.getAnimations()
						.filter(
							(animation) =>
								animation instanceof CSSTransition &&
								animation.transitionProperty.startsWith('--color-') &&
								Number(animation.effect?.getTiming().duration) > 0.01
						).length
			)
		).toBe(0)
	})

	test('updates document language after settings locale switch', async ({
		page
	}) => {
		await page.goto('/')
		await waitForApp(page)

		await page.getByTestId('btn-global-settings').click()
		await expect(page).toHaveURL(/\/settings(?:\?|$)/)
		await waitForSettingsRouteHydration(page)

		const currentLocale = await page
			.locator('input[name="settings-language"]:checked')
			.inputValue()
		const nextLocale = currentLocale === 'en' ? 'nb' : 'en'

		await page.getByTestId(`settings-language-${nextLocale}`).check()

		await expect
			.poll(async () => {
				return page.evaluate(() => document.documentElement.lang)
			})
			.toBe(nextLocale)
	})
})
