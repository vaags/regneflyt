<script lang="ts">
	export let color: 'red' | 'blue' | 'yellow' = 'blue'
</script>

<p class="border-l-4 p-4 alert-{color} text-lg" role="alert">
	<slot />
</p>
