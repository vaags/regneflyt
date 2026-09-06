import { describe, expect, it } from 'vitest'
import {
	composeStructuredReviewText,
	formatDecisionSignal,
	formatMatrixReport,
	formatPhaseDeltaLine,
	formatPhaseSummaryLine,
	formatSimulatedProgressionReview
} from '#lib/helpers/analysis/offlineAnalysisReportFormatHelper.ts'
import {
	summarizeMatrix,
	type MatrixSummaryRow
} from '#lib/helpers/analysis/offlineAnalysisMatrixHelper.ts'
import type { OfflineAnalysisPhaseMap } from '#lib/helpers/analysis/offlineAnalysisHelper.ts'
import type {
	OfflineAnalysisFinding,
	OfflineAnalysisReviewSummary
} from '#lib/helpers/analysis/offlineAnalysisReviewHelper.ts'

describe('formatDecisionSignal', () => {
	it.each([
		[1, 1, 'Signal: higher-correctness, faster-progression'],
		[-1, -1, 'Signal: lower-correctness, slower-progression'],
		[0, 0, 'Signal: flat-correctness, flat-progression'],
		[1, -1, 'Signal: higher-correctness, slower-progression'],
		[-1, 1, 'Signal: lower-correctness, faster-progression']
	])(
		'correctDelta=%p meanSkillDelta=%p -> %p',
		(correctDelta, meanSkillDelta, expected) => {
			expect(formatDecisionSignal(correctDelta, meanSkillDelta)).toBe(expected)
		}
	)
})

describe('formatPhaseSummaryLine vs formatPhaseDeltaLine', () => {
	const phase: OfflineAnalysisPhaseMap['early'] = {
		steps: 10,
		correctCount: 7,
		incorrectCount: 3,
		meanSkillDelta: 1.234
	}

	it('labels absolute phase values distinctly from delta values', () => {
		expect(formatPhaseSummaryLine('Early', phase)).toBe(
			'Early: steps=10, correct=7, incorrect=3, meanSkill=1.23'
		)
		expect(formatPhaseDeltaLine('Early', phase)).toBe(
			'Early: stepDelta=10, correctDelta=7, incorrectDelta=3, meanSkillDelta=1.23'
		)
	})
})

describe('composeStructuredReviewText', () => {
	it('joins sections under fixed headers and drops undefined metadata lines', () => {
		const text = composeStructuredReviewText({
			metrics: ['metric-a'],
			review: ['review-a'],
			metadata: ['meta-a', undefined, 'meta-b']
		})

		expect(text).toBe(
			[
				'═══ METRICS ═══',
				'metric-a',
				'',
				'═══ SIMULATED PROGRESSION REVIEW ═══',
				'review-a',
				'',
				'═══ METADATA ═══',
				'meta-a',
				'meta-b'
			].join('\n')
		)
	})
})

describe('formatSimulatedProgressionReview', () => {
	function makeFinding(message: string): OfflineAnalysisFinding {
		return { kind: 'aggregate', severity: 'watch', message }
	}

	function makeReview(
		findings: OfflineAnalysisFinding[]
	): OfflineAnalysisReviewSummary {
		return {
			status: 'watch',
			evidence: {
				class: 'compare',
				changeScope: 'narrow',
				sufficient: true,
				advisoryOnly: false
			},
			findings
		}
	}

	it('shows a no-concerns fallback line when there are no findings', () => {
		const text = formatSimulatedProgressionReview(makeReview([]))

		expect(text).toContain(
			'No simulated progression concerns were detected for the reviewed scenarios.'
		)
	})

	it('caps key findings at 5 and reports the remaining count', () => {
		const findings = Array.from({ length: 7 }, (_, i) =>
			makeFinding(`finding-${i}`)
		)

		const text = formatSimulatedProgressionReview(makeReview(findings))

		for (let i = 0; i < 5; i++) {
			expect(text).toContain(`finding-${i}`)
		}
		expect(text).not.toContain('finding-5')
		expect(text).not.toContain('finding-6')
		expect(text).toContain(
			'2 additional finding(s) available in JSON artifact.'
		)
	})

	it('omits the overflow line when findings fit within the cap', () => {
		const findings = Array.from({ length: 5 }, (_, i) =>
			makeFinding(`finding-${i}`)
		)

		const text = formatSimulatedProgressionReview(makeReview(findings))

		expect(text).not.toContain('additional finding(s)')
	})

	it.each<{
		finding: OfflineAnalysisFinding
		expected: string
	}>([
		{
			finding: {
				kind: 'phase_acceleration',
				severity: 'info',
				message: 'accelerated',
				metric: 'steps',
				value: -12
			},
			expected: '(steps=-12)'
		},
		{
			finding: {
				kind: 'phase_acceleration',
				severity: 'info',
				message: 'fractional acceleration',
				metric: 'steps',
				value: -13.67
			},
			expected: '(steps=-13.67)'
		},
		{
			finding: {
				kind: 'phase_coverage',
				severity: 'watch',
				message: 'low coverage',
				metric: 'coverage',
				value: 17,
				threshold: 20
			},
			expected: '(coverage=17, threshold=20)'
		},
		{
			finding: {
				kind: 'aggregate',
				severity: 'watch',
				message: 'whole count',
				metric: 'correctCount',
				value: -3
			},
			expected: '(correctCount=-3)'
		},
		{
			finding: {
				kind: 'aggregate',
				severity: 'watch',
				message: 'fractional count',
				metric: 'correctCount',
				value: -1.33
			},
			expected: '(correctCount=-1.33)'
		},
		{
			finding: {
				kind: 'aggregate',
				severity: 'watch',
				message: 'incorrect count',
				metric: 'incorrectCount',
				value: 1.5
			},
			expected: '(incorrectCount=1.5)'
		},
		{
			finding: {
				kind: 'aggregate',
				severity: 'watch',
				message: 'skill delta',
				metric: 'meanSkillDelta',
				value: -0.075
			},
			expected: '(meanSkillDelta=-0.0750)'
		},
		{
			finding: {
				kind: 'aggregate',
				severity: 'watch',
				message: 'fallback',
				value: 1.5
			},
			expected: '(value=1.5000)'
		},
		{
			finding: {
				kind: 'aggregate',
				severity: 'watch',
				message: 'negative zero',
				metric: 'correctCount',
				value: -0
			},
			expected: '(correctCount=0)'
		},
		{
			finding: {
				kind: 'aggregate',
				severity: 'watch',
				message: 'negative zero skill',
				metric: 'meanSkillDelta',
				value: -0
			},
			expected: '(meanSkillDelta=0.0000)'
		}
	])(
		'formats $finding.metric finding values as $expected',
		({ finding, expected }) => {
			const text = formatSimulatedProgressionReview(makeReview([finding]))

			expect(text).toContain(expected)
		}
	)
})

describe('formatMatrixReport', () => {
	function makeRow(
		overrides: Partial<MatrixSummaryRow> = {}
	): MatrixSummaryRow {
		return {
			seed: 1,
			operator: 'addition',
			correctDelta: 1,
			incorrectDelta: -1,
			meanSkillDelta: 0.12,
			finalSkillDelta: [0.1, 0.2, 0.3, 0.4],
			phaseCoverage: { early: 10, mid: 10, late: 10 },
			phaseDelta: {
				early: {
					steps: 0,
					correctCount: 1,
					incorrectCount: -1,
					meanSkillDelta: 0.03
				},
				mid: {
					steps: 0,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0
				},
				late: {
					steps: 0,
					correctCount: 0,
					incorrectCount: 0,
					meanSkillDelta: 0
				}
			},
			...overrides
		}
	}

	it('omits the per-operator section when there are no operator rows', () => {
		const report = formatMatrixReport(summarizeMatrix([]))

		expect(report).not.toContain('Per-Operator Analysis:')
	})

	it('includes a per-operator section when rows are present', () => {
		const report = formatMatrixReport(summarizeMatrix([makeRow()]))

		expect(report).toContain('Per-Operator Analysis:')
		expect(report).toContain('addition: correct=+1.00')
	})

	it('does not add a spurious sign prefix for zero or negative averages', () => {
		const report = formatMatrixReport(
			summarizeMatrix([makeRow({ correctDelta: -2, meanSkillDelta: 0 })])
		)

		expect(report).toContain('Correctness: -2')
		expect(report).toContain('Progression: 0.0000')
		expect(report).not.toContain('+0.0000')
		expect(report).not.toContain('+-2')
	})
})
