<script lang="ts">
	export let label: string
</script>

<span
	class="before:content after:content relative block h-5 w-5
            before:absolute before:top-2 before:h-1 before:w-5 before:-rotate-45 before:bg-red-600
            after:absolute after:top-2 after:h-1 after:w-5 after:rotate-45 after:bg-red-600"
	aria-label={label}
></span>
