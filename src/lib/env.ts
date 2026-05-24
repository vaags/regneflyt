/**
 * Safe environment flags that work both inside Vite (dev / build / SSR)
 * and outside it (Playwright tests, plain Node scripts).
 *
 * Vite statically replaces `import.meta.env.PROD` / `.DEV` at build time,
 * so dead-code elimination still works in production bundles.
 */
export const isProd: boolean = import.meta.env?.PROD === true
export const isDev: boolean = import.meta.env?.DEV === true
