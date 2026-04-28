import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const hooksServerPath = new URL('../src/hooks.server.ts', import.meta.url)
const svelteConfigPath = new URL('../svelte.config.js', import.meta.url)

function extractSystemScript(source) {
	// Anchored on the sync comment, not the variable name, so a rename won't silently
	// skip validation. The comment on the line immediately above the template literal
	// is the stable coupling point.
	const match = source.match(
		/\/\/[^\n]*stay in sync with the CSP hash[^\n]*\n[^`\n]*`([\s\S]*?)`/
	)
	if (!match || match[1] == null) {
		throw new Error(
			'Could not locate the CSP-targeted inline script in src/hooks.server.ts.\n' +
				'Ensure the comment "// This script must stay in sync with the CSP hash in svelte.config.js"' +
				' appears on the line immediately before the script template literal.'
		)
	}

	return match[1]
}

function extractConfiguredHash(source) {
	// Scope to the 'script-src' array so an unrelated sha256 elsewhere in the config
	// (e.g. style-src) doesn't shadow the one we care about.
	const match = source.match(/'script-src':\s*\[[^\]]*'sha256-([^']+)'/)
	if (!match || match[1] == null) {
		throw new Error(
			"Could not locate a sha256 hash in the 'script-src' directive of svelte.config.js"
		)
	}

	return match[1]
}

function toSha256Base64(value) {
	return createHash('sha256').update(value, 'utf8').digest('base64')
}

const [hooksServerSource, svelteConfigSource] = await Promise.all([
	readFile(hooksServerPath, 'utf8'),
	readFile(svelteConfigPath, 'utf8')
])

const systemScript = extractSystemScript(hooksServerSource)
const configuredHash = extractConfiguredHash(svelteConfigSource)
const actualHash = toSha256Base64(systemScript)

if (configuredHash !== actualHash) {
	console.error('CSP hash mismatch for inline theme bootstrap script')
	console.error(`Configured: sha256-${configuredHash}`)
	console.error(`Actual:     sha256-${actualHash}`)
	process.exitCode = 1
} else {
	console.log('CSP hash validation passed for inline theme bootstrap script')
}
