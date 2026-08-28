# Changelog

All notable changes to Regneflyt are documented in this file.

This changelog was introduced retroactively from the commit histories of the
current repository and its archived predecessor,
[`regneflyt-frontend`](https://github.com/vaags/regneflyt-frontend). Historical
entries are curated summaries and may combine closely related changes. Version
headings do not imply that corresponding Git tags or formal releases existed.
Dates on version headings are when those versions first appeared in
`package.json`; they are not independently verified deployment dates.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.57.2] - 2026-08-28

### Changed

- Hide the unanswered puzzle placeholder while the numeric answer field is
  focused, while preserving pending negative-answer feedback.

## [2.57.1] - 2026-08-28

### Added

- Validate quiz answers against the supported numeric range and provide clearer
  error feedback.

## [2.57.0] - 2026-08-27

### Changed

- Improve the numeric answer input's accessibility and keyboard semantics.
- Preserve the intended numpad focus after submitting an answer with the
  keyboard.
- Disable inappropriate autocomplete for quiz answers.

### Fixed

- Improve dark-mode form-control border contrast.

## [2.56.1] - 2026-08-02

### Changed

- Strengthen accessibility invariants across the interface and regression test
  suite.
- Narrow persisted data schemas to reject unreachable or invalid stored state.

## [2.56.0] - 2026-07-12

### Added

- Add progress codes for saving and restoring learner progress.
- Validate progress-code format and checksums before loading data.

### Changed

- Require confirmation before a loaded progress code replaces existing progress.

## [2.55.2] - 2026-07-05

### Fixed

- Return learners to their previous route when they cancel a quiz.

## [2.55.1] - 2026-07-05

### Changed

- Remove the page-level slide transition from settings navigation.

## [2.55.0] - 2026-07-05

### Changed

- Preserve expanded and collapsed panel state while navigating between routes.

## [2.54.0] - 2026-07-04

### Changed

- Reframe offline analysis around review-only findings and clearer comparison
  reports.
- Simplify adaptive-tuning validation and offline-analysis command-line
  configuration.

### Fixed

- Correct quiz-navigation view transitions and remove obsolete deferred
  navigation behavior.

## [2.53.1] - 2026-06-26

### Changed

- Replace the development simulation route with offline analysis for reviewing
  adaptive-tuning changes.
- Improve offline analysis comparisons and adaptive-difficulty tuning.

## [2.53.0] - 2026-06-18

### Removed

- Remove quiz replay from the quiz, results, and navigation flows.

## [2.52.0] - 2026-06-18

### Removed

- Remove next-focus and focused-practice flows from the quiz experience.
- Remove concept-history tracking and persistent concept-weakness feedback from
  quiz results.

## Historical development

Historical sections summarize development periods for which reliable release
boundaries cannot be established.

### Current repository — 2022-01-19 to 2026-06-17

#### June 2026 — learner feedback and maintenance

##### Added

- Add persistent concept-weakness feedback based on quiz history.
- Add focused practice for identified weaknesses before it was subsequently
  retired with the next-focus flow.

##### Changed

- Simplify the service worker and align project setup with the current
  SvelteKit configuration.
- Add explicit Node.js and npm engine requirements.

#### May 2026 — adaptive progression and analysis tooling

##### Added

- Guarantee a minimum positive skill gain after correct answers.
- Add dynamic difficulty windows for adaptive puzzle selection.
- Add a simulation page, tuning context, persisted developer tools, and
  algorithm-transparency views for inspecting adaptive behavior.
- Add keyboard access and responsive layouts for simulation tooling.

##### Changed

- Smooth the addition difficulty curve and simplify adaptive-tuning parameters.

##### Fixed

- Cap low-skill penalties to prevent hard resets of learner progress.
- Correct reset controls and contrast issues in analysis tooling.

#### April 2026 — navigation, onboarding, and results

##### Added

- Add a consolidated global navigation system and integrate the quiz numpad
  into the application shell.
- Add result cards, an onboarding panel, and a dedicated results route.
- Revise interface translations and add Open Graph metadata.

##### Changed

- Increase numpad touch-target sizes and improve small-viewport quiz and
  results layouts.
- Rework results presentation and preserve quiz skill levels in saved results.
- Refine adaptive quiz handling and learner-progression tuning.

##### Fixed

- Correct update notifications, service-worker error feedback, and quiz replay
  so replaying a quiz does not change skill levels.
- Correct viewport overflow and first-load transition behavior.

##### Removed

- Remove the day-streak feature.

#### March 2026 — adaptive learning foundation

##### Added

- Add adaptive learner profiles, weighted operator selection, and
  difficulty-aware skill updates.
- Add calibration for new learners, operator-specific progression, and shared
  skill state between adaptive and custom quiz modes.
- Add skill-change feedback, a skill dialog, combined skill percentage, and a
  persistent last-completed quiz with results navigation.
- Add localization, a settings route, page titles, panel expansion controls,
  global action navigation, and toast feedback.
- Add repeated-error guidance, puzzle star counts, and a delete-progress action.

##### Changed

- Tune scoring and progression separately for addition, subtraction,
  multiplication, and division.
- Gate negative subtraction answers on adaptive skill and remove the legacy
  negative-answer behavior.
- Replace the high-score display with combined learner skill.
- Improve theme transitions, language changes, preview refresh behavior, and
  results animations.

##### Fixed

- Prevent easy puzzles at high skill levels and correct progression near the
  maximum skill level.
- Correct unrestricted-mode completion, dialog focus restoration, navigation,
  stale theme backgrounds, and split-button overflow.
- Harden persisted and URL-supplied data and remove service-worker telemetry.

##### Removed

- Remove per-puzzle timeout behavior, obsolete score entities, the game-over
  component, and the share dialog.

#### February 2026 — modernization and dark mode

##### Added

- Add dark mode and improve dark-theme text contrast.

##### Changed

- Rework service-worker registration and update behavior.
- Modernize the application dependencies and Tailwind integration.
- Begin revising operator-specific puzzle scoring for multiplication, addition,
  and subtraction.

#### 2024

##### Added

- Add analytics.

##### Changed

- Refine user-facing wording.

#### 2023

##### Added

- Add an option to allow negative answers and always show quiz-duration
  settings.

##### Changed

- Update puzzle previews only when a setting affects the generated puzzle.
- Migrate the application to SvelteKit 2.

##### Fixed

- Exclude zero where random-number generation requires a non-zero value.
- Correct static-asset and service-worker handling.
- Correct maximum-number behavior and prevent negative answers at the lowest
  subtraction difficulty.

#### 2022

##### Added

- Add Web Share API support, high-score displays, and a custom numeric answer
  input.
- Add a get-ready countdown and show incorrect answers in results.

##### Changed

- Improve the addition puzzle algorithm, quiz difficulty tuning, and menu
  defaults.
- Improve semantic panel structure, keyboard behavior, and WCAG AAA contrast.
- Migrate through major SvelteKit updates.

##### Fixed

- Correct scrolling, server-side rendering, validation, service-worker, and
  layout behavior after the framework migration.

#### SvelteKit migration — 2022-01-19

##### Changed

- Move development from the archived
  [`regneflyt-frontend`](https://github.com/vaags/regneflyt-frontend)
  repository to this SvelteKit repository.
- Port the existing quiz, puzzle generation, scoring, settings, sharing, and
  results functionality.
- Restore offline support and deployment configuration after the migration.

### Predecessor application — 2020-07-06 to 2022-01-04

Development before the SvelteKit migration took place in the archived
[`regneflyt-frontend`](https://github.com/vaags/regneflyt-frontend) repository.

#### April 2021–January 2022 — final predecessor maintenance

##### Changed

- Update the predecessor application through Tailwind CSS and Tailwind CSS 3
  migrations.
- Simplify visual styling and add explanatory settings text.

##### Fixed

- Apply final security fixes before the SvelteKit migration.

#### January–March 2021 — difficulty and PWA refinement

##### Added

- Add a difficulty selector and shared difficulty levels for all operators.
- Add operator-specific addition and subtraction ranges.
- Add numeric input hints for mobile keyboards and clearer timeout feedback.
- Add visible focus styling for keyboard navigation.

##### Changed

- Improve puzzle generation and avoid undesirable double-zero combinations.
- Improve shared-quiz previews and compatibility with previously shared
  settings.
- Update asset caching and Workbox integration.

##### Fixed

- Correct service-worker and web-app manifest behavior.
- Correct hidden previews, puzzle submission, layout shifts, and control focus.

#### October–December 2020 — interface and results redesign

##### Added

- Add comparisons showing improvement or regression from the previous round.
- Add new result-card and puzzle-preview layouts, tooltips, and iconography.

##### Changed

- Consolidate settings menus and hide advanced options until needed.
- Improve mobile layouts, progress indicators, fonts, and card presentation.

##### Fixed

- Correct contrast, font rendering, flexbox cards, and mobile layout issues.

#### August–September 2020 — quiz and scoring refinement

##### Added

- Add quiz scoring, high scores, and additional result statistics.
- Add quiz-progress and timing refinements, including configurable puzzle time
  limits.

##### Changed

- Improve default quiz settings, answer validation, and shareable settings
  URLs.
- Improve puzzle generation and operator-specific configuration.

##### Fixed

- Correct quiz timing, result presentation, settings persistence, and
  service-worker behavior.

#### July 2020 — initial application

##### Added

- Create the initial Regneflyt math game with quiz start, cancellation, puzzle,
  and results flows.
- Expand the original addition-only implementation to support subtraction,
  multiplication, and division.
- Add configurable operators, number ranges, randomization, quiz duration, and
  URL-based settings for sharing configured quizzes.
- Add answer validation, automatic submission at a puzzle time limit, and
  result statistics.
- Add conditional unknown puzzle terms and decimal-free division puzzles.
- Add responsive layouts, custom checkboxes and radio controls, application
  metadata, icons, and Norwegian interface wording.

##### Changed

- Improve operator selection and allow multiplication and division to use
  multiple values.
- Debounce URL updates while changing settings.

##### Fixed

- Correct range-slider styling, browser layout conflicts, form structure, and
  puzzle equal-sign rendering.
