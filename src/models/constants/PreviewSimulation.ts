export const previewSimulationEventName = 'simulatePuzzlePreview' as const

export const previewSimulationOutcomes = {
	correct: 'correct',
	incorrect: 'incorrect'
} as const

export type PreviewSimulationOutcome =
	(typeof previewSimulationOutcomes)[keyof typeof previewSimulationOutcomes]
