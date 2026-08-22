import { describe, expect, it } from 'vitest'
import { ESLint } from 'eslint'

/*
 * The UX invariant bans in `eslint.config.js` are AST selectors tied to the
 * `svelte-eslint-parser` node shape. A parser upgrade that renames a node type
 * would turn every ban into a silent no-op with a green build, so each one is
 * exercised against a snippet it must reject and a snippet it must accept.
 */

const eslint = new ESLint({ cache: false })

/*
 * The snippet text is linted, not the file, but the path must exist in the
 * TypeScript project or the type-aware parser refuses to run. So the probes
 * borrow real paths that own none of the bans. If one ever gains an exemption,
 * the paired "allows" case against the real owner starts failing.
 */
const probeComponent = 'src/lib/components/widgets/ToastComponent.svelte'
const probeModule = 'src/lib/helpers/quiz/quizMenuHelper.ts'

async function lint(code: string, filePath: string): Promise<string[]> {
	const [result] = await eslint.lintText(code, { filePath })
	const messages = result?.messages ?? []

	// A parse failure produces no rule messages at all, which would otherwise
	// read as "the ban did not fire" instead of "the snippet never parsed".
	const fatal = messages.find((message) => message.fatal)
	if (fatal) {
		throw new Error(`${filePath} failed to parse: ${fatal.message}`)
	}

	return messages
		.filter((message) => message.ruleId === 'no-restricted-syntax')
		.map((message) => message.message)
}

describe('UX invariant lint bans', () => {
	it('rejects a raw <dialog> outside DialogComponent', async () => {
		expect(await lint('<dialog></dialog>', probeComponent)).toEqual([
			expect.stringContaining('DialogComponent')
		])
	}, 10_000)

	it('allows a raw <dialog> inside DialogComponent', async () => {
		expect(
			await lint(
				'<dialog></dialog>',
				'src/lib/components/widgets/DialogComponent.svelte'
			)
		).toEqual([])
	})

	it('rejects a literal assertive live region', async () => {
		expect(
			await lint('<div aria-live="assertive"></div>', probeComponent)
		).toEqual([expect.stringContaining('ValidationMessageComponent')])
	})

	it('allows a literal assertive live region in ValidationMessageComponent', async () => {
		expect(
			await lint(
				'<div aria-live="assertive"></div>',
				'src/lib/components/widgets/ValidationMessageComponent.svelte'
			)
		).toEqual([])
	})

	it('rejects a computed live region politeness', async () => {
		expect(
			await lint(
				'<script lang="ts">let loud = false</script>\n<div aria-live={loud ? "assertive" : "polite"}></div>',
				probeComponent
			)
		).toEqual([expect.stringContaining('static literal')])
	})

	it('allows a literal polite live region', async () => {
		expect(
			await lint('<div aria-live="polite"></div>', probeComponent)
		).toEqual([])
	})

	it('rejects a <form> without onsubmit', async () => {
		expect(await lint('<form></form>', probeComponent)).toEqual([
			expect.stringContaining('onsubmit')
		])
	})

	it('does not let a nested onsubmit satisfy the form ban', async () => {
		expect(
			await lint(
				'<script lang="ts">const noop = () => {}</script>\n<form><div onsubmit={noop}></div></form>',
				probeComponent
			)
		).toEqual([expect.stringContaining('onsubmit')])
	})

	it('allows a <form> with onsubmit', async () => {
		expect(
			await lint(
				'<script lang="ts">const noop = () => {}</script>\n<form onsubmit={noop}></form>',
				probeComponent
			)
		).toEqual([])
	})

	it('rejects a local focus ring in a static class attribute', async () => {
		expect(
			await lint('<div class="focus-visible:ring-2"></div>', probeComponent)
		).toEqual([expect.stringContaining('focus-ring')])
	})

	it('rejects a local focus ring in a class expression', async () => {
		expect(
			await lint(
				'<script lang="ts">const ring = "focus:ring-2"</script>\n<div class={ring}></div>',
				probeComponent
			)
		).toEqual([expect.stringContaining('focus-ring')])
	})

	it('rejects a local focus ring in a module', async () => {
		expect(
			await lint('export const ring = "focus-visible:ring-2"\n', probeModule)
		).toEqual([expect.stringContaining('focus-ring')])
	})

	it('allows the sanctioned focus utilities', async () => {
		expect(
			await lint(
				'<div class="focus-ring focus-ring-surface focus-ring-inverse"></div>',
				probeComponent
			)
		).toEqual([])
	})
})
