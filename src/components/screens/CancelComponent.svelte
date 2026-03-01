<script lang="ts">
	export let showCompleteButton: boolean
	export let onAbortQuiz: () => void = () => {}
	export let onCompleteQuiz: () => void = () => {}
	let showWarning = false

	const toggleWarning = () => (showWarning = !showWarning)
	const abortQuiz = () => onAbortQuiz()
	const completeQuiz = () => onCompleteQuiz()
</script>

<div class="text-right text-lg text-gray-700 dark:text-gray-300">
	{#if showWarning}
		<span class="mr-1 text-gray-900 dark:text-gray-100">Avslutt?</span>
		<button
			class="rounded border border-red-800 bg-white px-3 py-1 text-red-800 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-300 focus:outline-none dark:border-red-400 dark:bg-gray-700 dark:text-red-300 dark:hover:bg-red-900/30 dark:focus:ring-red-400"
			on:click|preventDefault={abortQuiz}
			color="red">Ja</button
		>
		<button
			class="rounded border border-blue-800 bg-white px-3 py-1 text-blue-800 transition-colors hover:bg-blue-50 focus:ring-2 focus:ring-blue-300 focus:outline-none dark:border-blue-400 dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-blue-900/30 dark:focus:ring-blue-400"
			on:click|preventDefault={toggleWarning}>Nei</button
		>
	{:else}
		{#if showCompleteButton}
			<button
				aria-label="Fullfør quiz"
				class="min-h-11 min-w-11 rounded border border-green-800 bg-white px-2 py-1 text-lg leading-none text-green-800 transition-colors hover:bg-green-50 focus:ring-2 focus:ring-green-300 focus:outline-none dark:border-green-400 dark:bg-gray-700 dark:text-green-300 dark:hover:bg-green-900/30 dark:focus:ring-green-400"
				on:click|preventDefault={completeQuiz}>&check;</button
			>
		{/if}
		<button
			aria-label="Angre"
			class="min-h-11 min-w-11 rounded border border-red-800 bg-white px-2 py-1 text-lg leading-none text-red-800 transition-colors hover:bg-red-50 focus:ring-2 focus:ring-red-300 focus:outline-none dark:border-red-400 dark:bg-gray-700 dark:text-red-300 dark:hover:bg-red-900/30 dark:focus:ring-red-400"
			on:click|preventDefault={toggleWarning}
			color="gray">&cross;</button
		>
	{/if}
</div>
