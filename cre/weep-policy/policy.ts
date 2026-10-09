/**
 * What Gemini is asked for, and how its answer becomes a policy WeepPolicyRegistry will accept.
 * No SDK imports, so it can be tested on its own: node --test policy.test.ts
 */

export type Policy = { foh: number; boh: number; bar: number; names: string[]; groups: number[] }

export const MAX_TEAM = 100
export const GROUPS = ['floor', 'kitchen', 'bar'] as const

export const INSTRUCTIONS = `You set up tipping for a restaurant, bar or café on Weep.
Read the owner's description and return their team and how pooled tips are split.
- Groups: floor (front of house: servers, hosts, baristas, runners), kitchen (back of house: chefs, cooks, dishwashers), bar (bartenders).
- Return each person's first name exactly as written. Never return emails or wallet addresses.
- If a split is given for only some groups, give the rest 0. If no split is given, use foh 60, boh 30, bar 10.
- Percentages are whole numbers that add up to exactly 100.
- Never invent people.`

export const RESPONSE_SCHEMA = {
	type: 'OBJECT',
	properties: {
		employees: {
			type: 'ARRAY',
			items: {
				type: 'OBJECT',
				properties: { name: { type: 'STRING' }, group: { type: 'STRING', format: 'enum', enum: [...GROUPS] } },
				required: ['name', 'group'],
			},
		},
		pool: {
			type: 'OBJECT',
			properties: { foh: { type: 'INTEGER' }, boh: { type: 'INTEGER' }, bar: { type: 'INTEGER' } },
			required: ['foh', 'boh', 'bar'],
		},
	},
	required: ['employees', 'pool'],
}

export const geminiRequest = (description: string) => ({
	systemInstruction: { parts: [{ text: INSTRUCTIONS }] },
	contents: [{ role: 'user', parts: [{ text: description }] }],
	generationConfig: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA, temperature: 0 },
})

const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/
const WALLET = /0x[0-9a-fA-F]{8,}/

/** Turns Gemini's raw response body into a policy, or throws if the pool would refuse it. */
export function toPolicy(responseBody: string): Policy {
	const answer = JSON.parse(responseBody) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
	const read = JSON.parse(answer.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}') as {
		employees?: { name?: unknown; group?: unknown }[]
		pool?: { foh?: unknown; boh?: unknown; bar?: unknown }
	}

	const team = (read.employees ?? [])
		.map((e) => ({ name: String(e.name ?? '').trim().slice(0, 40), group: GROUPS.indexOf(e.group as (typeof GROUPS)[number]) }))
		.filter((e) => e.name && e.group >= 0)
	const pct = (v: unknown) => Math.max(0, Math.round(Number(v) || 0))
	const policy: Policy = {
		foh: pct(read.pool?.foh),
		boh: pct(read.pool?.boh),
		bar: pct(read.pool?.bar),
		names: team.map((e) => e.name),
		groups: team.map((e) => e.group),
	}

	if (policy.foh + policy.boh + policy.bar !== 100) throw new Error("The split doesn't add up to 100%")
	if (policy.names.length === 0 || policy.names.length > MAX_TEAM) throw new Error('The team must have 1 to 100 people')
	if (new Set(policy.names.map((n) => n.toLowerCase())).size !== policy.names.length) throw new Error('Two people share a name')
	// Names go onchain in public, so an email or wallet in a name field stops the report.
	if (policy.names.some((n) => EMAIL.test(n) || WALLET.test(n))) throw new Error('A name looks like an email or wallet')
	return policy
}
