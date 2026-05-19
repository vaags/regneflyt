<script lang="ts">
	import type { Locale } from '$lib/paraglide/runtime.js'
	import { getSettingsRouteContext } from '$lib/contexts/settingsRouteContext'

	const settingsRouteContext = getSettingsRouteContext()

	let switchResult = $state<string>('unset')

	function triggerSwitchLocale(nextLocale: Locale) {
		const result = settingsRouteContext.switchLocale(nextLocale)
		switchResult = result ?? 'undefined'
	}

	function triggerSimulateUpdate() {
		settingsRouteContext.simulateUpdateNotification()
	}
</script>

<button
	type="button"
	data-testid="probe-switch-locale"
	onclick={() => {
		triggerSwitchLocale('nb')
	}}
>
	Switch Locale
</button>
<button
	type="button"
	data-testid="probe-simulate-update"
	onclick={triggerSimulateUpdate}
>
	Simulate Update
</button>
<div data-testid="probe-switch-result">{switchResult}</div>
