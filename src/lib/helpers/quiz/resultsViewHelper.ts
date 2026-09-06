export function formatPuzzleDurationSeconds(
	duration: number,
	locale: string
): string {
	return (Math.round(duration * 10) / 10).toLocaleString(locale)
}
