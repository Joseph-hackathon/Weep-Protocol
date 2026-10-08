import { encodeFunctionData, keccak256, parseAbi, toHex } from "viem";

/**
 * WeepPay on Monad testnet: one payment to many people, each with an exact amount, in one transaction that
 * lands in full or not at all. It holds no money and keeps no rules (contracts/contracts/WeepPay.sol).
 */
export const PAY = (process.env.NEXT_PUBLIC_WEEP_PAY || "0xa0209c2245FdD5928a7a602a2d4c7d4239CF5A26") as `0x${string}`;
export const MAX_RECIPIENTS = 100;

const abi = parseAbi(["function pay(address[] to, uint256[] amounts, uint256 total, bytes32 ref)"]);

/** `ref` ties the payment to exactly what the sender reviewed: a hash of the recipients and amounts. */
export function payData(to: string[], amounts: bigint[]) {
  const total = amounts.reduce((a, b) => a + b, BigInt(0));
  const ref = keccak256(toHex(to.map((t, i) => `${t.toLowerCase()}:${amounts[i]}`).join(",")));
  return encodeFunctionData({ abi, functionName: "pay", args: [to as `0x${string}`[], amounts, total, ref] });
}
