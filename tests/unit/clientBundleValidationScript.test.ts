import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

function runClientBundleValidator(clientOutputDir: string) {
	return spawnSync(
		'node',
		['scripts/validate-client-bundle.mjs', clientOutputDir],
		{
			cwd: process.cwd(),
			encoding: 'utf8'
		}
	)
}

describe('client bundle validation script', () => {
	const tempDirs: string[] = []

	afterEach(() => {
		while (tempDirs.length > 0) {
			const tempDir = tempDirs.pop()
			if (tempDir !== undefined) {
				rmSync(tempDir, { recursive: true, force: true })
			}
		}
	})

	function createClientOutputFixture(): string {
		const clientOutputDir = mkdtempSync(
			join(tmpdir(), 'regneflyt-client-bundle-')
		)
		tempDirs.push(clientOutputDir)
		return clientOutputDir
	}

	it('accepts a client bundle without removed SvelteKit modules', () => {
		const clientOutputDir = createClientOutputFixture()
		writeFileSync(join(clientOutputDir, 'app.js'), 'console.log("app")', 'utf8')

		const result = runClientBundleValidator(clientOutputDir)

		expect(result.status).toBe(0)
		expect(result.stdout).toContain(
			'Client bundle validation passed (1 JavaScript files checked).'
		)
	})

	it('rejects a bundle that includes the removed $app/stores compatibility stub', () => {
		const clientOutputDir = createClientOutputFixture()
		writeFileSync(
			join(clientOutputDir, 'legacy-dependency.js'),
			'throw Error("`$app/stores` has been removed in favour of `$app/state`")',
			'utf8'
		)

		const result = runClientBundleValidator(clientOutputDir)

		expect(result.status).not.toBe(0)
		expect(result.stderr).toContain('legacy-dependency.js')
		expect(result.stderr).toContain('removed $app/stores compatibility stub')
		expect(result.stderr).toContain('@vercel/analytics/sveltekit-next')
	})

	it('rejects a missing client build output directory', () => {
		const result = runClientBundleValidator(
			'/tmp/regneflyt-missing-client-bundle'
		)

		expect(result.status).not.toBe(0)
		expect(result.stderr).toContain('Client build output not found')
		expect(result.stderr).toContain('Run "npm run build"')
	})
})
