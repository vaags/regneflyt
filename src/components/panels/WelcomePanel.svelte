<script lang="ts">
	import { slide } from 'svelte/transition'
	import { AppSettings } from '../../models/constants/AppSettings'
	import PanelComponent from '../widgets/PanelComponent.svelte'
</script>

<div transition:slide|local={AppSettings.transitionDuration} class="mb-1 md:mb-2">
	<PanelComponent>
		<p class="text-blue-800">Regneflyt er et mattespill som trener deg i hoderegning.</p>
	</PanelComponent>
</div>
