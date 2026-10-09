import { encodeFunctionData, keccak256, parseAbi, toHex } from "viem";

/**
 * WeepPay on Monad testnet: one payment to many people, each with an exact amount, in one transaction that
 * lands in full or not at all. Weep's fee (fixed in the contract) is paid on top by the sender; the contract
 * holds no money (contracts/contracts/WeepPay.sol). Set per deployment with NEXT_PUBLIC_WEEP_PAY; a production
 * build without it stops (next.config.ts).
 */
export const PAY = (process.env.NEXT_PUBLIC_WEEP_PAY || "0x0000000000000000000000000000000000000000") as `0x${string}`;
export const MAX_RECIPIENTS = 100;

const abi = parseAbi(["function pay(address[] to, uint256[] amounts, uint256 total, uint256 expectedFee, bytes32 ref)"]);

/**
 * `expectedFee` is the fee the sender reviewed; the contract refuses any other. `ref` ties the payment to exactly
 * what the sender reviewed: a hash of the recipients and amounts.
 */
export function payData(to: string[], amounts: bigint[], expectedFee: bigint) {
  const total = amounts.reduce((a, b) => a + b, BigInt(0));
  const ref = keccak256(toHex(to.map((t, i) => `${t.toLowerCase()}:${amounts[i]}`).join(",")));
  return encodeFunctionData({ abi, functionName: "pay", args: [to as `0x${string}`[], amounts, total, expectedFee, ref] });
}
