import type { Component } from 'svelte'

export async function ensureLazyComponentLoaded<
	TProps extends Record<string, unknown>,
	TExports extends Record<string, unknown>
>(
	component: Component<TProps, TExports> | null,
	load: () => Promise<{ default: Component<TProps, TExports> }>,
	assign: (value: Component<TProps, TExports>) => void,
	onLoaded: () => Promise<void>
): Promise<void> {
	if (component !== null) return

	assign((await load()).default)
	await onLoaded()
}
