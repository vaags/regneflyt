export type LanguageAliasMap = Readonly<Record<string, string>>

export function applyLanguageTagAliasesToAcceptLanguage(
	acceptLanguageHeader: string | null,
	aliasByLanguageTag: LanguageAliasMap
): { aliasedHeader: string | null; changed: boolean } {
	if (acceptLanguageHeader === null || acceptLanguageHeader === '') {
		return { aliasedHeader: null, changed: false }
	}

	const aliasedHeader = acceptLanguageHeader
		.split(',')
		.map((part) => {
			const trimmed = part.trim()
			if (trimmed === '') return trimmed

			const [rawTag, ...params] = trimmed.split(';')
			if (rawTag === undefined || rawTag === '') return trimmed

			const normalizedTag = rawTag.toLowerCase()
			const baseTagCandidate = normalizedTag.split('-')[0]
			const baseTag =
				baseTagCandidate === undefined || baseTagCandidate === ''
					? normalizedTag
					: baseTagCandidate
			const alias =
				aliasByLanguageTag[normalizedTag] ?? aliasByLanguageTag[baseTag]

			if (alias === undefined || alias === '') return trimmed

			return params.length ? `${alias};${params.join(';')}` : alias
		})
		.join(', ')

	const changed = aliasedHeader !== acceptLanguageHeader
	return {
		aliasedHeader: changed ? aliasedHeader : acceptLanguageHeader,
		changed
	}
}
