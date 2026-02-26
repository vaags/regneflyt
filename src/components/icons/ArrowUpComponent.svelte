<script lang="ts">
	export let label: string
</script>

<span
	class="before:content after:content relative inline-block h-5 w-4
    before:absolute before:top-1 before:left-2 before:h-5 before:w-1 before:bg-green-600 after:absolute after:top-1 after:left-1
    after:h-3 after:w-3 after:rotate-45 after:border-t-4 after:border-l-4 after:border-green-600"
	aria-label={label}
></span>
