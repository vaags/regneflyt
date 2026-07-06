// A local, unauthenticated player identity used to keep adaptive skill data
// separate when up to two children share one device. No accounts, no sync,
// no arbitrary naming — just two fixed slots.
export const defaultPlayerProfileId = 'default' as const
export const secondaryPlayerProfileId = 'secondary' as const

export type PlayerProfileId =
	typeof defaultPlayerProfileId | typeof secondaryPlayerProfileId

/** Resolves the display name for a player profile id. */
export function getPlayerProfileName(
	id: PlayerProfileId,
	defaultName: string,
	secondaryName: string
): string {
	return id === secondaryPlayerProfileId ? secondaryName : defaultName
}
