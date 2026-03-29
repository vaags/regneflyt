export type LanguageAliasMap = Readonly<Record<string, string>>

export function applyLanguageTagAliasesToAcceptLanguage(
	acceptLanguageHeader: string | null,
	aliasByLanguageTag: LanguageAliasMap
): { aliasedHeader: string | null; changed: boolean } {
	if (!acceptLanguageHeader) {
		return { aliasedHeader: null, changed: false }
	}

	let changed = false
	const aliasedHeader = acceptLanguageHeader
		.split(',')
		.map((part) => {
			const trimmed = part.trim()
			if (!trimmed) return trimmed

			const [rawTag, ...params] = trimmed.split(';')
			if (!rawTag) return trimmed

			const normalizedTag = rawTag.toLowerCase()
			const baseTag = normalizedTag.split('-')[0] ?? normalizedTag
			const alias =
				aliasByLanguageTag[normalizedTag] ?? aliasByLanguageTag[baseTag]

			if (!alias) return trimmed

			changed = true
			return params.length ? `${alias};${params.join(';')}` : alias
		})
		.join(', ')

	return {
		aliasedHeader: changed ? aliasedHeader : acceptLanguageHeader,
		changed
	}
}
