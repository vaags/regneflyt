<script lang="ts">
	import {
		button_copy_link,
		button_results,
		label_copy_link_same_puzzles
	} from '$lib/paraglide/messages.js'
	import ButtonComponent from '../widgets/ButtonComponent.svelte'
	import SplitButtonComponent from '../widgets/SplitButtonComponent.svelte'
	import ActionsBarLayout from './ActionsBarLayout.svelte'
	import StartQuizActionButton from './StartQuizActionButton.svelte'

	let {
		onStart,
		onReplay = undefined,
		onShowResults = undefined,
		onCopyLink = undefined,
		onCopyDeterministicLink = undefined
	}: {
		onStart: () => void
		onReplay?: (() => void) | undefined
		onShowResults?: (() => void) | undefined
		onCopyLink?: (() => void | Promise<void>) | undefined
		onCopyDeterministicLink?: (() => void | Promise<void>) | undefined
	} = $props()

	let hasCopyLinkActions = $derived(!!onCopyLink && !!onCopyDeterministicLink)
	let hasSecondaryActions = $derived(hasCopyLinkActions || !!onShowResults)
</script>

{#snippet primaryActions()}
	<StartQuizActionButton {onReplay} {onStart} fullWidth={true} />
{/snippet}

{#snippet secondaryActions()}
	{#if onShowResults}
		<ButtonComponent
			onclick={onShowResults}
			color="gray"
			size="small"
			testId="btn-results">{button_results()}</ButtonComponent
		>
	{/if}
	{#if hasCopyLinkActions}
		<SplitButtonComponent
			onclick={() => onCopyLink?.()}
			onSecondaryClick={() => onCopyDeterministicLink?.()}
			secondaryLabel={label_copy_link_same_puzzles()}
			variant="outline"
			color="gray"
			size="small"
			testId="btn-copy-link"
		>
			{button_copy_link()}
		</SplitButtonComponent>
	{/if}
{/snippet}

<ActionsBarLayout
	testId="menu-actions"
	{primaryActions}
	secondaryActions={hasSecondaryActions ? secondaryActions : undefined}
/>
