import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const mode = process.argv[2]

const rawInput = await readStdin()
const payload = rawInput.trim() ? JSON.parse(rawInput) : {}

const stateDir = path.join(os.tmpdir(), 'regneflyt-copilot-hooks')
const sessionStatePath = payload.sessionId
	? path.join(stateDir, `${payload.sessionId}.json`)
	: null

ensureDir(stateDir)

const defaultState = {
	sawWriteTool: false,
	reviewBlockedOnce: false
}

const state = readJson(sessionStatePath, defaultState)

if (mode === 'pre-tool') {
	handlePreTool(payload, state)
}

if (mode === 'post-tool') {
	handlePostTool(payload, state)
}

if (mode === 'stop') {
	handleStop(payload, state)
}

process.stdout.write('{}')

function handlePreTool(input, sessionState) {
	const toolName = input.tool_name
	const toolInput = input.tool_input ?? {}

	const terminalCommand = getToolCommand(toolName, toolInput)
	if (terminalCommand && isGitWriteCommand(terminalCommand)) {
		respond({
			hookSpecificOutput: {
				hookEventName: 'PreToolUse',
				permissionDecision: 'ask',
				permissionDecisionReason:
					'Git write operations require explicit user confirmation in this workspace.'
			},
			systemMessage:
				'Hook: Git write command detected. Approval is required before the tool can continue.'
		})
	}

	if (terminalCommand && isDependencyCommand(terminalCommand)) {
		respond({
			hookSpecificOutput: {
				hookEventName: 'PreToolUse',
				permissionDecision: 'ask',
				permissionDecisionReason:
					'Dependency changes require explicit user confirmation in this workspace.'
			},
			systemMessage:
				'Hook: Dependency-changing command detected. Approval is required before the tool can continue.'
		})
	}

	const touchedPaths = getTouchedPaths(toolName, toolInput)
	if (touchedPaths.some(isSensitiveConfigPath)) {
		respond({
			hookSpecificOutput: {
				hookEventName: 'PreToolUse',
				permissionDecision: 'ask',
				permissionDecisionReason:
					'Editing dependency, build, deployment, or CI configuration requires explicit user confirmation.'
			},
			systemMessage:
				'Hook: Sensitive config file edit detected. Approval is required before the tool can continue.'
		})
	}

	if (isWriteTool(toolName)) {
		sessionState.sawWriteTool = true
		writeJson(sessionStatePath, sessionState)
	}
}

function handlePostTool(input, sessionState) {
	if (isWriteTool(input.tool_name)) {
		sessionState.sawWriteTool = true
		sessionState.reviewBlockedOnce = false
		writeJson(sessionStatePath, sessionState)
	}
}

function handleStop(input, sessionState) {
	if (!sessionState.sawWriteTool) {
		cleanupState()
		return
	}

	if (input.stop_hook_active || sessionState.reviewBlockedOnce) {
		cleanupState()
		return
	}

	sessionState.reviewBlockedOnce = true
	writeJson(sessionStatePath, sessionState)

	respond({
		hookSpecificOutput: {
			hookEventName: 'Stop',
			decision: 'block',
			reason:
				'Perform an explicit post-change review before finishing. Check your changes for regressions, naming, duplication, accessibility, i18n impact, type safety, and validation status, then summarize the review in the final response.'
		}
	})
}

function cleanupState() {
	if (!sessionStatePath) {
		return
	}

	try {
		fs.unlinkSync(sessionStatePath)
	} catch {
		// Ignore missing or locked state files.
	}
}

function respond(output) {
	process.stdout.write(`${JSON.stringify(output)}\n`)
	process.exit(0)
}

function readStdin() {
	return new Promise((resolve, reject) => {
		let data = ''
		process.stdin.setEncoding('utf8')
		process.stdin.on('data', (chunk) => {
			data += chunk
		})
		process.stdin.on('end', () => resolve(data))
		process.stdin.on('error', reject)
	})
}

function getToolCommand(toolName, toolInput) {
	if (toolName === 'run_in_terminal') {
		return toolInput.command ?? ''
	}

	if (toolName === 'create_and_run_task') {
		const task = toolInput.task ?? {}
		return [task.command, ...(task.args ?? [])].filter(Boolean).join(' ')
	}

	return ''
}

function getTouchedPaths(toolName, toolInput) {
	if (toolName === 'create_file') {
		return [toolInput.filePath].filter(Boolean)
	}

	if (toolName === 'apply_patch') {
		return extractPathsFromPatch(toolInput.input ?? '')
	}

	return []
}

function extractPathsFromPatch(patchText) {
	const matches = patchText.matchAll(
		/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm
	)
	return [...matches].map((match) => match[1].trim())
}

function isWriteTool(toolName) {
	return new Set([
		'apply_patch',
		'create_file',
		'edit_notebook_file',
		'create_directory'
	]).has(toolName)
}

function isGitWriteCommand(command) {
	return /\bgit\s+(add|commit|checkout|switch|restore|reset|revert|stash|rebase|merge|cherry-pick|am|apply|clean|rm|mv|push|pull)\b/i.test(
		command
	)
}

function isDependencyCommand(command) {
	return /\b(?:npm|pnpm|yarn|bun)\s+(?:install|add|remove|rm|uninstall|update|upgrade)\b/i.test(
		command
	)
}

function isSensitiveConfigPath(filePath) {
	const normalizedPath = filePath.replaceAll('\\', '/')

	return (
		[
			'package.json',
			'package-lock.json',
			'pnpm-lock.yaml',
			'yarn.lock',
			'bun.lockb',
			'bun.lock',
			'eslint.config.js',
			'vite.config.ts',
			'vitest.config.ts',
			'playwright.config.ts',
			'svelte.config.js',
			'tsconfig.json',
			'vercel.json'
		].includes(path.basename(normalizedPath)) ||
		/(^|\/)\.github\/workflows\//.test(normalizedPath)
	)
}

function ensureDir(dirPath) {
	fs.mkdirSync(dirPath, { recursive: true })
}

function readJson(filePath, fallbackValue) {
	if (!filePath) {
		return cloneValue(fallbackValue)
	}

	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'))
	} catch {
		return cloneValue(fallbackValue)
	}
}

function cloneValue(value) {
	return JSON.parse(JSON.stringify(value))
}

function writeJson(filePath, value) {
	if (!filePath) {
		return
	}

	ensureDir(path.dirname(filePath))
	fs.writeFileSync(filePath, `${JSON.stringify(value)}\n`)
}
