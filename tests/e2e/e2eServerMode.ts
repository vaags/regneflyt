export const isCi = process.env.CI != null
export const usesProductionE2eServer =
	process.env.E2E_SERVER_MODE === 'production' || isCi
