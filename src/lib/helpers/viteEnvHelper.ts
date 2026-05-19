const viteEnv = (import.meta as { env?: Record<string, unknown> }).env

export type ViteEnvBooleanFlag = 'DEV' | 'PROD'

export function isViteEnvFlagEnabled(flag: ViteEnvBooleanFlag): boolean {
	return viteEnv?.[flag] === true
}
