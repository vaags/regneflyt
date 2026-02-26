<script lang="ts">
	// ref: https://css.gg/alarm
	export let label: string
</script>

<span
	class="relative ml-1.5 inline-block h-2 w-2 scale-150 rounded-full text-gray-900"
	aria-label={label}
></span>

<style>
	span {
		background:
			linear-gradient(to left, currentColor 5px, transparent 0) no-repeat 1.5px
				3px/4px 2px,
			linear-gradient(to left, currentColor 2px, transparent 0) no-repeat 1.5px
				1px/2px 3px;
		border: 1px solid transparent;
		box-shadow: 0 0 0 2px;
	}
	span::after,
	span::before {
		content: '';
		position: absolute;
		width: 4px;
		height: 2px;
		background: currentColor;
		top: -4px;
	}
	span::before {
		left: -4px;
		transform: rotate(-42deg);
	}
	span::after {
		transform: rotate(42deg);
		right: -4px;
	}
</style>
