export type E2eServerMode = 'development' | 'production' | 'preview'

export function resolveE2eServerMode(
	configuredMode: string | undefined,
	isCi: boolean
): E2eServerMode {
	if (
		configuredMode !== undefined &&
		configuredMode !== 'development' &&
		configuredMode !== 'production' &&
		configuredMode !== 'preview'
	) {
		throw new Error(
			`Unsupported E2E_SERVER_MODE "${configuredMode}". Use development, production, or preview.`
		)
	}

	return configuredMode ?? (isCi ? 'production' : 'development')
}

export const isCi = process.env.CI != null
export const e2eServerMode = resolveE2eServerMode(
	process.env.E2E_SERVER_MODE,
	isCi
)
export const usesProductionE2eServer = e2eServerMode !== 'development'
export const buildsE2eServer = e2eServerMode === 'production'
