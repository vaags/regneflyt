/**
 * Safe environment flags that work both inside Vite (dev / build / SSR)
 * and outside it (Playwright tests, plain Node scripts).
 *
 * Vite statically replaces `import.meta.env.PROD` / `.DEV` at build time,
 * so dead-code elimination still works in production bundles.
 */
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-boolean-literal-compare -- import.meta.env is undefined outside Vite
export const isProd: boolean = import.meta.env?.PROD === true
// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/no-unnecessary-boolean-literal-compare -- import.meta.env is undefined outside Vite
export const isDev: boolean = import.meta.env?.DEV === true
