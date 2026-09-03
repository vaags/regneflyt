import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const defaultClientOutputDir = path.resolve('.svelte-kit/output/client')
const clientOutputDir = path.resolve(process.argv[2] ?? defaultClientOutputDir)
const removedModuleSignature = '$app/stores` has been removed'

async function findJavaScriptFiles(directory) {
	const entries = await readdir(directory, { withFileTypes: true })
	const files = []

	for (const entry of entries) {
		const entryPath = path.join(directory, entry.name)
		if (entry.isDirectory()) {
			files.push(...(await findJavaScriptFiles(entryPath)))
		} else if (entry.isFile() && entry.name.endsWith('.js')) {
			files.push(entryPath)
		}
	}

	return files
}

let files
try {
	files = await findJavaScriptFiles(clientOutputDir)
} catch (error) {
	if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
		throw new Error(
			`Client build output not found at ${clientOutputDir}. Run "npm run build" before validating the client bundle.`
		)
	}

	throw error
}

for (const file of files) {
	const source = await readFile(file, 'utf8')
	if (source.includes(removedModuleSignature)) {
		throw new Error(
			`Generated client bundle imports the removed $app/stores compatibility stub in ${path.relative(
				clientOutputDir,
				file
			)}. Use SvelteKit 3-compatible dependency entry points such as @vercel/analytics/sveltekit-next.`
		)
	}
}

console.log(
	`Client bundle validation passed (${files.length} JavaScript files checked).`
)
