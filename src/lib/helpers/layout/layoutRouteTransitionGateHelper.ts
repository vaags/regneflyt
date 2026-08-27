// Schedules clearing the route-navigation-in-flight gate once a client-side
// navigation has settled, whether it completes normally or fails/aborts:
// navigationComplete rejects if the navigation fails or is aborted. Once
// settled, wait two animation frames before releasing the gate so synchronous
// entrance transitions evaluated during mount have observed the "in flight"
// state. The release predicate lets a caller retain the gate when a newer
// navigation has taken ownership; that newer owner is then responsible for
// releasing it. Mirrors the double-RAF settle used for initial-load class
// removal in layoutSetupHelper.ts.
export function scheduleRouteNavigationGateRelease(
	navigationComplete: Promise<void>,
	requestAnimationFrameFn: (callback: () => void) => number,
	onSettled: () => void,
	shouldRelease: () => boolean = () => true
): void {
	const release = (): void => {
		requestAnimationFrameFn(() => {
			requestAnimationFrameFn(() => {
				if (shouldRelease()) onSettled()
			})
		})
	}
	navigationComplete.then(release, release)
}
