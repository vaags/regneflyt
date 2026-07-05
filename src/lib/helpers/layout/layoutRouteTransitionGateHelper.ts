// Schedules clearing the route-navigation-in-flight gate once a client-side
// navigation has settled, whether it completes normally or fails/aborts:
// navigationComplete rejects if the navigation fails or is aborted (e.g. a
// second navigation supersedes it), and the gate must still be released in
// that case or entrance transitions would stay suppressed app-wide for the
// rest of the session. Once settled, wait two animation frames before
// releasing the gate so any synchronous entrance transitions evaluated
// during mount have already observed the "in flight" state. Mirrors the
// double-RAF settle used for initial-load class removal in
// layoutSetupHelper.ts.
export function scheduleRouteNavigationGateRelease(
	navigationComplete: Promise<void>,
	requestAnimationFrameFn: (callback: () => void) => number,
	onSettled: () => void
): void {
	const release = (): void => {
		requestAnimationFrameFn(() => {
			requestAnimationFrameFn(onSettled)
		})
	}
	navigationComplete.then(release, release)
}
