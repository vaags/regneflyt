const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator

/** Short tap feedback for key presses */
export function hapticTap(): void {
	if (canVibrate) navigator.vibrate(10)
}
