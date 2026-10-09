import { decodeFunctionResult, encodeFunctionData, keccak256, parseAbi, toBytes } from "viem";
import { call } from "./chain";

/**
 * WeepPolicyRegistry: the team and split Weep's Chainlink CRE workflow read from a business's description, signed by
 * the Chainlink DON and recorded on Monad. A record only; it has no power over any pool. An empty value turns it off.
 */
export const POLICY_REGISTRY = (process.env.NEXT_PUBLIC_WEEP_POLICY_REGISTRY ?? "0x6437a6BD79d388E70f726Fee9f15f3d0245ddc9c") as `0x${string}` | "";
const registryAbi = parseAbi([
  "function policyOf(address pool) view returns ((uint8 foh, uint8 boh, uint8 bar, bytes32 descriptionHash, uint64 attestedAt, string[] names, uint8[] groups))",
]);
export type Attestation = { foh: number; boh: number; bar: number; names: string[]; groups: number[]; descriptionHash: string };
/** The latest CRE attestation for a pool, or null if there's none (or no registry). */
export async function readAttestation(pool: string): Promise<Attestation | null> {
  if (!POLICY_REGISTRY) return null;
  const raw = await call(POLICY_REGISTRY, encodeFunctionData({ abi: registryAbi, functionName: "policyOf", args: [pool as `0x${string}`] }));
  const p = decodeFunctionResult({ abi: registryAbi, functionName: "policyOf", data: raw as `0x${string}` });
  if (p.attestedAt === BigInt(0)) return null;
  return { foh: p.foh, boh: p.boh, bar: p.bar, names: [...p.names], groups: [...p.groups], descriptionHash: p.descriptionHash.toLowerCase() };
}
/** The hash the workflow records for a description: keccak256 of the trimmed text. */
export const descriptionHash = (text: string) => keccak256(toBytes(text.trim())).toLowerCase();
