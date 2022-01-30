<script lang="ts">
	import '../app.css';
</script>

<div class="container mx-auto max-w-lg px-1 md:px-3 py-1 md:py-2">
	<header>
		<h1 class="text-right -mb-1">
			<span class="font-handwriting text-3xl md:text-4xl text-orange-500">Regneflyt</span>
			<small class="font-light text-xs text-gray-400"
				><a href="https://github.com/vaags/regneflyt-frontend">3.0.1</a></small
			>
		</h1>
	</header>
	<main>
		<slot />
	</main>
</div>
