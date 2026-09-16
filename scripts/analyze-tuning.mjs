import fs from 'node:fs'
import path from 'node:path'
import { adaptiveTuning } from '../src/lib/domain/skill-progression/adaptiveTuning.ts'
import { validateAdaptiveTuning } from '../src/lib/domain/skill-progression/adaptiveTuningValidation.ts'
import {
	validateDifficultyScoreRegistries,
	validatePuzzleGenerationSettings
} from '../src/lib/domain/puzzle-generation/puzzleGenerationSettings.ts'
import {
	getTuningAnalysisHelp,
	parseTuningAnalysisArgs
} from '../src/lib/helpers/analysis/tuningAnalysisCliHelper.ts'
import {
	createTuningAnalysisArtifact,
	loadTuningSnapshot
} from '../src/lib/helpers/analysis/tuningAnalysisHelper.ts'
import { formatTuningAnalysisArtifact } from '../src/lib/helpers/analysis/tuningAnalysisFormatHelper.ts'

function readTuning(filePath) {
	return loadTuningSnapshot(
		JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8')),
		filePath
	)
}

function defaultOutputPath(now) {
	const timestamp = now.toISOString().replace(/[:.]/g, '-')
	return path.join('analysis-artifacts', `tuning-${timestamp}.json`)
}

validateAdaptiveTuning(adaptiveTuning)
validatePuzzleGenerationSettings()
validateDifficultyScoreRegistries()

const options = parseTuningAnalysisArgs(process.argv.slice(2))
if (options.help) {
	console.log(getTuningAnalysisHelp())
	process.exit(0)
}

const startedAt = performance.now()
const generatedAt = new Date()
const config = {
	seeds: options.seeds,
	operators: options.operators,
	steps: options.steps,
	accuracy: options.accuracy,
	responseSeconds: options.responseSeconds,
	startingSkills: options.startingSkills
}

const artifact =
	options.baseline === undefined
		? createTuningAnalysisArtifact({
				config,
				tuning:
					options.tuning === undefined
						? adaptiveTuning
						: readTuning(options.tuning),
				inputs: options.tuning === undefined ? {} : { tuning: options.tuning },
				generatedAt
			})
		: createTuningAnalysisArtifact({
				config,
				baseline: readTuning(options.baseline),
				candidate: readTuning(options.candidate),
				inputs: {
					baseline: options.baseline,
					candidate: options.candidate
				},
				generatedAt
			})

artifact.elapsedMs = performance.now() - startedAt

const outputPath = path.resolve(options.out ?? defaultOutputPath(generatedAt))
fs.mkdirSync(path.dirname(outputPath), { recursive: true })
fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8')

console.log(formatTuningAnalysisArtifact(artifact))
console.log(`\nSaved JSON artifact: ${outputPath}`)
