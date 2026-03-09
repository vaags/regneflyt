<script lang="ts">
	import { onMount, setContext } from 'svelte'
	import * as m from '$lib/paraglide/messages.js'
	import {
		getLocale,
		setLocale,
		locales,
		type Locale
	} from '$lib/paraglide/runtime.js'

	let locale = $state(getLocale())

	const localeNames: Record<string, string> = {
		nb: 'Norsk',
		en: 'English',
		fr: 'Français',
		de: 'Deutsch',
		es: 'Español'
	}

	function switchLocale(newLocale: Locale) {
		if (newLocale !== getLocale()) {
			setLocale(newLocale, { reload: false })
			document.documentElement.lang = newLocale
			document.title = m.app_title_full()
			const desc = document.querySelector('meta[name="description"]')
			if (desc) desc.setAttribute('content', m.app_description())
			locale = newLocale
		}
	}
	import MenuComponent from '../components/screens/MenuComponent.svelte'
	import ResultsComponent from '../components/screens/ResultsComponent.svelte'
	import QuizComponent from '../components/screens/QuizComponent.svelte'
	import { AppSettings } from '../models/constants/AppSettings'
	import { clearDevStorage } from '../stores'
	import type { Puzzle } from '../models/Puzzle'
	import { getQuizStats } from '../helpers/statsHelper'
	import type { QuizStats } from '../models/QuizStats'
	import { getQuiz } from '../helpers/quizHelper'
	import { QuizState } from '../models/constants/QuizState'
	import type { Quiz } from '../models/Quiz'
	import WelcomePanel from '../components/panels/WelcomePanel.svelte'
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

	let skillDialog = $state<SkillDialogComponent>(undefined!)
	let updateNotification = $state<UpdateNotification>(undefined!)

	let quizStats = $state<QuizStats>(undefined!)
	let puzzleSet = $state<Puzzle[]>(undefined!)
	let quiz = $state<Quiz>(undefined!)
	let preQuizSkill: AdaptiveSkillMap = $state([...defaultAdaptiveSkillMap])
	let animateSkill = $state(false)
	let showContent = $state(false)
	let showWelcomePanel = $state(true)

	function getReady(updatedQuiz: Quiz) {
		quiz = updatedQuiz
		quiz.state = QuizState.AboutToStart
		quiz.adaptiveSkillByOperator = [...$adaptiveSkills]
		preQuizSkill = [...quiz.adaptiveSkillByOperator]
		showWelcomePanel = false
		scrollToTop()
	}

	const startQuiz = () => (quiz.state = QuizState.Started)
	const hideWelcomePanel = () => (showWelcomePanel = false)
	const abortQuiz = () => (quiz.state = QuizState.Initial)

	setContext('startQuiz', startQuiz)
	setContext('abortQuiz', abortQuiz)

	function completeQuiz(completedPuzzleSet: Puzzle[]) {
		quiz.state = QuizState.Completed
		puzzleSet = completedPuzzleSet
		quizStats = getQuizStats(puzzleSet)
		$adaptiveSkills = [...quiz.adaptiveSkillByOperator]
		$totalCorrect += quizStats.correctAnswerCount
		$totalAttempted += puzzleSet.length

		$lastResults = { puzzleSet, quizStats, quiz: { ...quiz }, preQuizSkill }
		animateSkill = true
	}

	function resetQuiz() {
		quiz.state = QuizState.Initial
		scrollToTop()
	}

	function showResults() {
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
	}

	function scrollToTop() {
		window.scrollTo({
			top: 0,
			left: 0,
			behavior: 'smooth'
		})
	}

	onMount(() => {
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
			class="font-handwriting -mb-1 flex flex-row-reverse items-center justify-between text-3xl md:text-4xl"
		>
			<h1
				class="cursor-pointer text-4xl text-orange-700 drop-shadow-sm md:text-5xl dark:text-orange-500 dark:drop-shadow-md"
			>
				<button onclick={() => (showWelcomePanel = !showWelcomePanel)}>
					{m.app_title()}</button
				>
			</h1>
			{#if $overallSkill || $lastResults}
				<button
					class="text-yellow-900 transition-colors hover:text-yellow-800 dark:text-yellow-100 dark:hover:text-yellow-200"
					title={m.heading_skill_level()}
					onclick={() => skillDialog.open()}
				>
					{$overallSkill}%
				</button>
			{/if}
		</header>
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
		<footer
			class="mt-auto flex flex-col items-center gap-2 py-4 font-sans text-sm text-gray-600 dark:text-gray-300"
		>
			<select
				class="cursor-pointer rounded border border-gray-400 bg-transparent px-2 py-1 text-sm text-gray-800 dark:border-gray-500 dark:text-gray-100"
				aria-label={m.label_language()}
				value={locale}
				onchange={(e) => switchLocale(e.currentTarget.value as Locale)}
			>
				{#each locales as l}
					<option value={l}>{localeNames[l] ?? l.toUpperCase()}</option>
				{/each}
			</select>
			{#if !AppSettings.isProduction}
				<button
					class="underline hover:text-gray-700 dark:hover:text-gray-300"
					onclick={() => {
						clearDevStorage()
						window.location.reload()
					}}>{m.clear_dev_storage()}</button
				>
				<button
					class="underline hover:text-gray-700 dark:hover:text-gray-300"
					onclick={() => updateNotification.showNotification()}
					>{m.update_available()}</button
				>
			{/if}
		</footer>
		<SkillDialogComponent bind:this={skillDialog} />
		<UpdateNotification bind:this={updateNotification} />
	</div>
{/key}
