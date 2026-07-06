<script lang="ts">
	import {
		heading_players,
		label_default_player_name,
		label_secondary_player_name
	} from '$lib/paraglide/messages.js'
	import {
		defaultPlayerProfileId,
		secondaryPlayerProfileId
	} from '$lib/models/PlayerProfile'
	import type { PlayerProfileId } from '$lib/models/PlayerProfile'
	import PanelComponent from '$lib/components/widgets/PanelComponent.svelte'

	let {
		activeProfileId,
		onSwitchProfile
	}: {
		// undefined before client hydration: the server has no access to
		// localStorage, so it can't know the real active profile. Leaving
		// both radios unchecked until then avoids briefly showing the wrong
		// one checked (see settings/+page.svelte's settingsRouteHydrated).
		activeProfileId: PlayerProfileId | undefined
		onSwitchProfile: (id: PlayerProfileId) => void
	} = $props()

	let profileOptions = $derived([
		{ id: defaultPlayerProfileId, name: label_default_player_name() },
		{ id: secondaryPlayerProfileId, name: label_secondary_player_name() }
	])
</script>

<PanelComponent heading={heading_players()} collapsible={false}>
	<fieldset>
		<legend class="sr-only">{heading_players()}</legend>
		{#each profileOptions as option (option.id)}
			<label class="flex items-center py-1 text-lg">
				<input
					type="radio"
					data-testid="player-profile-{option.id}"
					class="h-5 w-5"
					name="active-player-profile"
					checked={option.id === activeProfileId}
					onchange={() => onSwitchProfile(option.id)}
					value={option.id}
				/>
				<span class="ml-2">{option.name}</span>
			</label>
		{/each}
	</fieldset>
</PanelComponent>
