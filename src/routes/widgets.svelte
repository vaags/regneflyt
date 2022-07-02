<script lang="ts">
	import '../app.css'
	import PanelComponent from '../components/widgets/PanelComponent.svelte'
	import NumpadComponent from '../components/widgets/NumpadComponent.svelte'
</script>

<div class="container mx-auto my-4 min-w-min max-w-lg px-1 md:px-3 md:py-2">
	<PanelComponent heading="Hei">
		Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nam ac ex id mi hendrerit ultrices sed
		id risus. Quisque eu suscipit nulla. Suspendisse id metus eu elit commodo tristique. Duis a
		tempus arcu. Praesent eget neque ligula. Nam luctus luctus venenatis. Aenean vitae arcu sed
		risus facilisis fringilla iaculis eu purus. Nam malesuada.</PanelComponent
	>
	<NumpadComponent />
</div>
