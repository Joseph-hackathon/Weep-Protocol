import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { geminiRequest, toPolicy } from './policy.ts'

// Wraps a model answer the way Gemini's generateContent returns it.
const gemini = (answer: unknown) => JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(answer) }] } }] })
const person = (name: string, group: string) => ({ name, group })

test('turns a read into names, groups and a split', () => {
	const p = toPolicy(gemini({ employees: [person('Sam', 'floor'), person('Ama', 'kitchen'), person('Kai', 'bar')], pool: { foh: 60, boh: 30, bar: 10 } }))
	assert.deepEqual(p, { foh: 60, boh: 30, bar: 10, names: ['Sam', 'Ama', 'Kai'], groups: [0, 1, 2] })
})

test('tidies names and drops people with no name or an unknown group', () => {
	const p = toPolicy(gemini({ employees: [person('  Sam  ', 'floor'), person('', 'bar'), person('Zed', 'office')], pool: { foh: 100, boh: 0, bar: 0 } }))
	assert.deepEqual(p.names, ['Sam'])
	assert.deepEqual(p.groups, [0])
})

test("refuses a split that isn't 100%", () => {
	assert.throws(() => toPolicy(gemini({ employees: [person('Sam', 'floor')], pool: { foh: 60, boh: 30, bar: 5 } })), /100%/)
})

test('refuses an empty team, a team over 100, and two people with the same name', () => {
	assert.throws(() => toPolicy(gemini({ employees: [], pool: { foh: 100, boh: 0, bar: 0 } })), /1 to 100/)
	const big = Array.from({ length: 101 }, (_, i) => person(`P${i}`, 'floor'))
	assert.throws(() => toPolicy(gemini({ employees: big, pool: { foh: 100, boh: 0, bar: 0 } })), /1 to 100/)
	assert.throws(() => toPolicy(gemini({ employees: [person('Sam', 'floor'), person('sam', 'bar')], pool: { foh: 50, boh: 0, bar: 50 } })), /share a name/)
})

test('never lets an email or wallet through as a name, since names are public onchain', () => {
	assert.throws(() => toPolicy(gemini({ employees: [person('sam@example.com', 'floor')], pool: { foh: 100, boh: 0, bar: 0 } })), /email or wallet/)
	assert.throws(() => toPolicy(gemini({ employees: [person('0x46181b2bb4549a4F29BBfa5f7549f565910E0773', 'floor')], pool: { foh: 100, boh: 0, bar: 0 } })), /email or wallet/)
})

test('refuses an answer that is not the JSON asked for', () => {
	assert.throws(() => toPolicy('not json'))
	assert.throws(() => toPolicy(JSON.stringify({ candidates: [] })), /100%/)
})

test('asks Gemini for a fixed schema at temperature 0', () => {
	const r = geminiRequest('Sam on the floor')
	assert.equal(r.generationConfig.temperature, 0)
	assert.equal(r.generationConfig.responseMimeType, 'application/json')
	assert.equal(r.contents[0].parts[0].text, 'Sam on the floor')
})
