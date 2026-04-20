// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import OnboardingPanel from '$lib/components/panels/OnboardingPanel.svelte'
import {
	button_start_training,
	heading_onboarding,
	onboarding_intro
} from '$lib/paraglide/messages.js'

describe('OnboardingPanel', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders heading, intro, and CTA', () => {
		const { getByTestId, getByText } = render(OnboardingPanel, {
			props: {
				onDismiss: vi.fn()
			}
		})

		expect(getByTestId('onboarding-panel')).toBeTruthy()
		expect(getByTestId('heading-onboarding').textContent).toContain(
			heading_onboarding()
		)
		expect(getByText(onboarding_intro())).toBeTruthy()
		expect(getByTestId('btn-onboarding-dismiss').textContent).toContain(
			button_start_training()
		)
	})

	it('calls onDismiss when CTA is clicked', async () => {
		const onDismiss = vi.fn()
		const { getByTestId } = render(OnboardingPanel, {
			props: { onDismiss }
		})

		await fireEvent.click(getByTestId('btn-onboarding-dismiss'))

		expect(onDismiss).toHaveBeenCalledTimes(1)
	})
})
