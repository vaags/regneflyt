<script lang="ts">
	import { onMount, setContext } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import { type Locale, getLocale } from '$lib/paraglide/runtime.js'
	import MenuComponent from '../components/screens/MenuComponent.svelte'
	import ResultsComponent from '../components/screens/ResultsComponent.svelte'
	import QuizComponent from '../components/screens/QuizComponent.svelte'
	import { clearDevStorage, theme, applyTheme } from '../stores'
	import type { Puzzle } from '../models/Puzzle'
	import { getQuizStats } from '../helpers/statsHelper'
	import type { QuizStats } from '../models/QuizStats'
	import { getQuiz } from '../helpers/quizHelper'
	import { QuizState } from '../models/constants/QuizState'
	import type { Quiz } from '../models/Quiz'
	import WelcomePanel from '../components/panels/WelcomePanel.svelte'
	import SettingsPanel from '../components/panels/SettingsPanel.svelte'
	import {
		adaptiveSkills,
		overallSkill,
		lastResults,
		totalCorrect,
		totalAttempted
	} from '../stores'
	import {
		type AdaptiveSkillMap,
		defaultAdaptiveSkillMap
	} from '../models/AdaptiveProfile'
	import SkillDialogComponent from '../components/dialogs/SkillDialogComponent.svelte'
	import UpdateNotification from '../components/UpdateNotification.svelte'
	import {
		getLocaleNames,
		switchLocale as doSwitchLocale
	} from '../helpers/localeHelper'

	let locale = $state<string>('')
	let localeNames = $derived(getLocaleNames())

	let skillDialog = $state<SkillDialogComponent>(undefined!)
	let updateNotification = $state<UpdateNotification>(undefined!)

	let quizStats = $state<QuizStats>(undefined!)
	let puzzleSet = $state<Puzzle[]>(undefined!)
	let quiz = $state<Quiz>(undefined!)
	let preQuizSkill: AdaptiveSkillMap = $state([...defaultAdaptiveSkillMap])
	let animateSkill = $state(false)
	let showContent = $state(false)
	let showWelcomePanel = $state(true)
	let showSettings = $state(false)

	// --- Quiz state machine ---

	type QuizAction =
		| { type: 'getReady'; quiz: Quiz }
		| { type: 'start' }
		| { type: 'abort' }
		| { type: 'complete'; puzzles: Puzzle[] }
		| { type: 'reset' }
		| { type: 'showResults' }

	const validTransitions: Record<QuizState, readonly QuizAction['type'][]> = {
		[QuizState.Initial]: ['getReady', 'showResults'],
		[QuizState.AboutToStart]: ['start', 'abort'],
		[QuizState.Started]: ['complete', 'abort'],
		[QuizState.Completed]: ['getReady', 'reset']
	}

	function dispatch(action: QuizAction) {
		if (!validTransitions[quiz.state]?.includes(action.type)) return

		switch (action.type) {
			case 'getReady': {
				quiz = action.quiz
				quiz.state = QuizState.AboutToStart
				quiz.adaptiveSkillByOperator = [...$adaptiveSkills]
				preQuizSkill = [...quiz.adaptiveSkillByOperator]
				showWelcomePanel = false
				scrollToTop()
				break
			}
			case 'start':
				quiz.state = QuizState.Started
				break
			case 'abort':
				quiz.state = QuizState.Initial
				break
			case 'complete': {
				quiz.state = QuizState.Completed
				puzzleSet = action.puzzles
				quizStats = getQuizStats(puzzleSet)
				$adaptiveSkills = [...quiz.adaptiveSkillByOperator]
				$totalCorrect += quizStats.correctAnswerCount
				$totalAttempted += puzzleSet.length
				$lastResults = { puzzleSet, quizStats, quiz: { ...quiz }, preQuizSkill }
				animateSkill = true
				break
			}
			case 'reset':
				quiz.state = QuizState.Initial
				scrollToTop()
				break
			case 'showResults': {
				if (!puzzleSet?.length && $lastResults) {
					puzzleSet = $lastResults.puzzleSet
					quizStats = $lastResults.quizStats
					quiz = { ...$lastResults.quiz }
					preQuizSkill = $lastResults.preQuizSkill ?? [
						...quiz.adaptiveSkillByOperator
					]
				}
				animateSkill = false
				quiz.state = QuizState.Completed
				scrollToTop()
				break
			}
		}
	}

	const getReady = (q: Quiz) => dispatch({ type: 'getReady', quiz: q })
	const startQuiz = () => dispatch({ type: 'start' })
	const abortQuiz = () => dispatch({ type: 'abort' })
	const completeQuiz = (puzzles: Puzzle[]) =>
		dispatch({ type: 'complete', puzzles })
	const resetQuiz = () => dispatch({ type: 'reset' })
	const showResults = () => dispatch({ type: 'showResults' })
	const hideWelcomePanel = () => (showWelcomePanel = false)

	setContext('startQuiz', startQuiz)
	setContext('abortQuiz', abortQuiz)

	function scrollToTop() {
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: 'smooth'
		})
	}

	onMount(() => {
		locale = getLocale()
		applyTheme($theme)
		window
			.matchMedia('(prefers-color-scheme: dark)')
			.addEventListener('change', () => {
				if ($theme === 'system') applyTheme('system')
			})

		const q = getQuiz(new URLSearchParams(window.location.search))
		q.adaptiveSkillByOperator = [...$adaptiveSkills]
		quiz = q
		showContent = true
	})
</script>

{#key locale}
	<a
		href="#main-content"
		class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-blue-700 focus:shadow dark:focus:bg-gray-800 dark:focus:text-blue-300"
	>
		{m.sr_skip_to_content()}
	</a>
	<div
		class="container mx-auto flex min-h-screen max-w-lg min-w-min flex-col px-2 py-2 md:max-w-xl md:px-4 md:py-3"
	>
		<header
			class="font-handwriting relative z-10 -mb-1 flex items-center justify-between text-3xl md:text-4xl"
		>
			<div class="flex items-center gap-3">
				{#if $overallSkill || $lastResults}
					<button
						class="text-yellow-900 transition-colors hover:text-yellow-800 dark:text-yellow-100 dark:hover:text-yellow-200"
						title={m.heading_skill_level()}
						onclick={() => skillDialog.open()}
					>
						{$overallSkill}%
					</button>
				{/if}
			</div>
			<div class="flex items-center gap-3">
				<h1
					class="cursor-pointer text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
				>
					<button onclick={() => (showWelcomePanel = !showWelcomePanel)}>
						{m.app_title()}</button
					>
				</h1>
				<button
					class="transition-colors {showSettings
						? 'text-gray-900 dark:text-gray-100'
						: 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'}"
					title={m.heading_settings()}
					aria-label={m.sr_open_settings()}
					aria-expanded={showSettings}
					onclick={() => (showSettings = !showSettings)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<line x1="4" y1="6" x2="20" y2="6" />
						<line x1="4" y1="12" x2="20" y2="12" />
						<line x1="4" y1="18" x2="20" y2="18" />
						<circle cx="8" cy="6" r="2" fill="currentColor" />
						<circle cx="16" cy="12" r="2" fill="currentColor" />
						<circle cx="10" cy="18" r="2" fill="currentColor" />
					</svg>
				</button>
			</div>
		</header>
		<SettingsPanel
			open={showSettings}
			{locale}
			{localeNames}
			onSwitchLocale={(l) => {
				const newLocale = doSwitchLocale(l as Locale)
				if (newLocale) locale = newLocale
			}}
			onClearDevStorage={() => {
				clearDevStorage()
				window.location.reload()
			}}
			onSimulateUpdate={() => updateNotification.showNotification()}
		/>
		<main id="main-content" class="mb-3 flex-1">
			{#if showWelcomePanel}
				<WelcomePanel />
			{/if}
			{#if showContent && quiz}
				{#if quiz.state === QuizState.AboutToStart || quiz.state === QuizState.Started}
					<QuizComponent {quiz} onCompleteQuiz={completeQuiz} />
				{:else if quiz.state === QuizState.Completed}
					<ResultsComponent
						{quiz}
						{quizStats}
						{puzzleSet}
						{preQuizSkill}
						{animateSkill}
						onGetReady={getReady}
						onResetQuiz={resetQuiz}
					/>
				{:else}
					<MenuComponent
						bind:quiz
						onGetReady={getReady}
						onHideWelcomePanel={hideWelcomePanel}
						onShowResults={puzzleSet?.length || $lastResults
							? showResults
							: undefined}
					/>
				{/if}
			{/if}
		</main>
		<footer></footer>
		<SkillDialogComponent bind:this={skillDialog} />
		<UpdateNotification bind:this={updateNotification} />
	</div>
{/key}
