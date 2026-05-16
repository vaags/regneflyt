<script lang="ts">
	let showCount = $state(0)

	export function showNotification() {
		showCount += 1
	}
</script>

<div data-testid="update-notification-mounted"></div>
<div data-testid="update-notification-show-count">{showCount}</div>
