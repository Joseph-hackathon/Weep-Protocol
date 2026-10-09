import {
	bytesToHex,
	consensusIdenticalAggregation,
	cre,
	EVMClient,
	getNetwork,
	type HTTPPayload,
	type HTTPSendRequester,
	hexToBase64,
	HTTPCapability,
	Runner,
	type Runtime,
	text,
	TxStatus,
} from '@chainlink/cre-sdk'
import { encodeAbiParameters, getAddress, isAddress, keccak256, parseAbiParameters, toBytes } from 'viem'
import { z } from 'zod'
import { geminiRequest, type Policy, toPolicy } from './policy'

/**
 * Weep's tip policy, read by Chainlink CRE.
 *
 * A business describes its team in plain words. This workflow asks Gemini to read the team (first names and
 * groups) and how team tips are split, checks the answer by the same rules the tip pool uses, and writes it to
 * WeepPolicyRegistry on Monad as a report the DON signed. Emails in the description are never part of the
 * report. The registry is a record only: the business still reviews the proposal and saves it to its pool.
 *
 * HTTP trigger input: { "pool": "0x…", "description": "…" }
 */

const configSchema = z.object({
	geminiModel: z.string(),
	evms: z.array(z.object({ chainSelectorName: z.string(), registry: z.string(), gasLimit: z.string() })).min(1),
})
type Config = z.infer<typeof configSchema>

const inputSchema = z.object({
	pool: z.string().refine((a) => isAddress(a), 'pool must be an address'),
	description: z.string().trim().min(1).max(4000),
})

/**
 * Runs on each node: one Gemini read, tidied and checked. The response is cached across nodes, so they agree on
 * the same answer (identical-aggregation consensus). Anything the pool would refuse stops here, unrecorded.
 */
const readPolicy = (sendRequester: HTTPSendRequester, config: Config, apiKey: string, description: string): string => {
	const resp = sendRequester
		.sendRequest({
			url: `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
			method: 'POST',
			headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
			body: Buffer.from(JSON.stringify(geminiRequest(description))).toString('base64'),
			cacheSettings: { store: true, maxAge: '60s' },
		})
		.result()
	if (resp.statusCode >= 300) throw new Error(`Gemini answered ${resp.statusCode}`)

	return JSON.stringify(toPolicy(text(resp)))
}

const onRequest = (runtime: Runtime<Config>, evmClient: EVMClient, payload: HTTPPayload): string => {
	const input = inputSchema.parse(JSON.parse(Buffer.from(payload.input).toString('utf8')))
	const pool = getAddress(input.pool)
	const apiKey = runtime.getSecret({ id: 'GEMINI_API_KEY' }).result().value

	const policy = JSON.parse(
		new cre.capabilities.HTTPClient()
			.sendRequest(runtime, readPolicy, consensusIdenticalAggregation<string>())(runtime.config, apiKey, input.description)
			.result(),
	) as Policy
	runtime.log(`Read ${policy.names.length} people, split ${policy.foh}/${policy.boh}/${policy.bar}`)

	const data = encodeAbiParameters(
		parseAbiParameters('address pool, bytes32 descriptionHash, uint8 foh, uint8 boh, uint8 bar, string[] names, uint8[] groups'),
		[pool, keccak256(toBytes(input.description)), policy.foh, policy.boh, policy.bar, policy.names, policy.groups],
	)
	const report = runtime
		.report({ encodedPayload: hexToBase64(data), encoderName: 'evm', signingAlgo: 'ecdsa', hashingAlgo: 'keccak256' })
		.result()

	const evm = runtime.config.evms[0]
	const resp = evmClient.writeReport(runtime, { receiver: evm.registry, report, gasConfig: { gasLimit: evm.gasLimit } }).result()
	if (resp.txStatus !== TxStatus.SUCCESS) throw new Error(`Writing the report failed: ${resp.errorMessage || resp.txStatus}`)

	const txHash = bytesToHex(resp.txHash || new Uint8Array(32))
	runtime.log(`Attested on Monad: https://testnet.monadexplorer.com/tx/${txHash}`)
	return txHash
}

const initWorkflow = (config: Config) => {
	const network = getNetwork({ chainFamily: 'evm', chainSelectorName: config.evms[0].chainSelectorName, isTestnet: true })
	if (!network) throw new Error(`Unknown chain: ${config.evms[0].chainSelectorName}`)
	const evmClient = new EVMClient(network.chainSelector.selector)
	const http = new HTTPCapability()

	// Simulation accepts an open trigger. Deploying to the DON needs authorizedKeys here (the caller's EVM address).
	return [cre.handler(http.trigger({}), (runtime: Runtime<Config>, payload: HTTPPayload) => onRequest(runtime, evmClient, payload))]
}

export async function main() {
	const runner = await Runner.newRunner<Config>({ configSchema })
	await runner.run(initWorkflow)
}

main()
