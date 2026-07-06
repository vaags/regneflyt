// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/svelte'
import {
	label_default_player_name,
	label_secondary_player_name
} from '$lib/paraglide/messages.js'
import {
	defaultPlayerProfileId,
	secondaryPlayerProfileId
} from '$lib/models/PlayerProfile'
import PlayerProfilesPanel from '$lib/components/panels/PlayerProfilesPanel.svelte'

describe('PlayerProfilesPanel', () => {
	afterEach(() => {
		cleanup()
	})

	it('renders both profile options with the default one checked', () => {
		const { getByTestId } = render(PlayerProfilesPanel, {
			activeProfileId: defaultPlayerProfileId,
			onSwitchProfile: () => {}
		})

		const defaultRadio = getByTestId(
			`player-profile-${defaultPlayerProfileId}`
		) as HTMLInputElement
		const secondaryRadio = getByTestId(
			`player-profile-${secondaryPlayerProfileId}`
		) as HTMLInputElement

		expect(defaultRadio.checked).toBe(true)
		expect(secondaryRadio.checked).toBe(false)
		expect(defaultRadio.parentElement?.textContent).toContain(
			label_default_player_name()
		)
		expect(secondaryRadio.parentElement?.textContent).toContain(
			label_secondary_player_name()
		)
	})

	it('leaves both radios unchecked when the active profile is not yet known (pre-hydration)', () => {
		const { getByTestId } = render(PlayerProfilesPanel, {
			activeProfileId: undefined,
			onSwitchProfile: () => {}
		})

		const defaultRadio = getByTestId(
			`player-profile-${defaultPlayerProfileId}`
		) as HTMLInputElement
		const secondaryRadio = getByTestId(
			`player-profile-${secondaryPlayerProfileId}`
		) as HTMLInputElement

		expect(defaultRadio.checked).toBe(false)
		expect(secondaryRadio.checked).toBe(false)
	})

	it('calls onSwitchProfile with the selected id when a different profile is chosen', async () => {
		const onSwitchProfile = vi.fn()
		const { getByTestId } = render(PlayerProfilesPanel, {
			activeProfileId: defaultPlayerProfileId,
			onSwitchProfile
		})

		await fireEvent.click(
			getByTestId(`player-profile-${secondaryPlayerProfileId}`)
		)

		expect(onSwitchProfile).toHaveBeenCalledTimes(1)
		expect(onSwitchProfile).toHaveBeenCalledWith(secondaryPlayerProfileId)
	})

	it('does not fire onSwitchProfile for the already-active profile', async () => {
		const onSwitchProfile = vi.fn()
		const { getByTestId } = render(PlayerProfilesPanel, {
			activeProfileId: defaultPlayerProfileId,
			onSwitchProfile
		})

		await fireEvent.click(
			getByTestId(`player-profile-${defaultPlayerProfileId}`)
		)

		expect(onSwitchProfile).not.toHaveBeenCalled()
	})
})
