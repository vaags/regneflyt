import { vi } from 'vitest'

export const replaceState = vi.fn()
export const goto = vi.fn(() => Promise.resolve())
export const invalidate = vi.fn()
export const invalidateAll = vi.fn()
export const preloadData = vi.fn()
export const preloadCode = vi.fn()
type AfterNavigateCallback = (navigation: {
	type: 'enter' | 'goto' | 'link' | 'popstate'
	shallow: boolean
	to: { url: URL } | null
}) => void

const afterNavigateCallbacks = new Set<AfterNavigateCallback>()

export const afterNavigate = vi.fn((callback: AfterNavigateCallback) => {
	afterNavigateCallbacks.add(callback)
})

export function triggerAfterNavigate(
	navigation: Parameters<AfterNavigateCallback>[0]
): void {
	for (const callback of afterNavigateCallbacks) {
		callback(navigation)
	}
}

export function clearAfterNavigateCallbacks(): void {
	afterNavigateCallbacks.clear()
}

export const beforeNavigate = vi.fn()
export const onNavigate = vi.fn()
export const pushState = vi.fn()
