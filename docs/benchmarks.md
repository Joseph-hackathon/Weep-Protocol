# Benchmarks

What Weep's main transactions cost and how long they take on Monad, measured with real transactions against the live contracts.

## Setup

| | |
|---|---|
| Network | Monad testnet (chain ID 10143), through the public endpoint `https://testnet-rpc.monad.xyz` |
| Date | 9 October 2026, starting 09:06 UTC |
| Contracts | WeepPay `0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5`, WeepPools `0xd2bd0685941DAe339D9E28224a5a912FBEb56317` |
| Script | [`contracts/scripts/benchmark.js`](../contracts/scripts/benchmark.js) |
| Sample size | 2 runs of each transaction |
| Note | Measured on the WeepPools above, before the pending-tips change of 9 October. Payouts now also clear one stored counter, a small fixed cost per payout. |

## Method

- **Pool payouts.**
  - One business pool is configured for each team size: 10, 50 and 100 people, split 60/30/10 across floor, kitchen and bar.
  - Before each run, the pool receives a team tip of $1 per person.
  - The measured transaction is `payoutTeam()`.
- **Send.** One `WeepPay.pay` to 20 people, $1 each, with the 0.3% fee on top.
- **Fresh recipients.** Every run uses brand-new wallets that have never held the token. That's the most expensive case, because each first transfer to an address costs more.
- **What's measured, per transaction:**
  - the gas used, from the receipt;
  - the test MON actually charged, as the sender's balance before minus after;
  - the time from submitting the transaction to its receipt, polled every 200 ms from a laptop.

## Results

| Transaction | Gas used | Test MON charged (run 1 · run 2) | Submit → receipt (run 1 · run 2) |
|---|---|---|---|
| Pool payout to 10 people | 441,858 | 0.0451 · 0.0455 | 2.24 s · 2.35 s |
| Pool payout to 50 people | 1,845,875 | 0.1901 · 0.1901 | 2.29 s · 1.90 s |
| Pool payout to 100 people | 3,598,866 | 0.4555 · 0.3707 | 1.91 s · 2.09 s |
| Send to 20 people (+0.3% fee) | 782,429 · 782,453 | 0.0798 · 0.0806 | 2.64 s · 2.25 s |

Transactions:
- Payouts to 10 people: [run 1](https://testnet.monadexplorer.com/tx/0xbf3d4b36fe8773c7ba7171500467ab531f71686619fbac56e79ed7863babac46), [run 2](https://testnet.monadexplorer.com/tx/0x87cf5791964b0e0e534537eb157faba97f3010e4400f76986efc75e810717b76).
- Payouts to 50 people: [run 1](https://testnet.monadexplorer.com/tx/0xf1fe6036f9e57a691a5419c45bf72f596ea6e84d47cecaaf59046a5cbff8e286), [run 2](https://testnet.monadexplorer.com/tx/0x9ffbdc4e2e03707529590be03c1c43191b301e50457e7860d888730609262e5d).
- Payouts to 100 people: [run 1](https://testnet.monadexplorer.com/tx/0xc94a7ef76d5392984e5a370a32878d42cd61dbf113a4c2a642e16d896c0c3e00), [run 2](https://testnet.monadexplorer.com/tx/0x20992dff987fc6d5c786f7528143c6b64c6c7d32ecfcd9b7a8918c65332cf2f8).
- Sends to 20 people: [run 1](https://testnet.monadexplorer.com/tx/0x921d30ba330345a6bf6f1ab39298a38acbc6f76126a157ba1ec363cef96543a6), [run 2](https://testnet.monadexplorer.com/tx/0x2394f83805782e5e3ec49029a5d18ebe1e09d44bafc7346e718b25caba9e7b36).

## What this shows

- **One transaction pays a whole team.** Paying 100 people used 3.6 million gas, about 2.4% of Monad's 150,000,000 block gas limit.
- **Cost grows with the team.** Gas rises in step with the number of people: about 35,000 gas per extra person on a payout ((1,845,875 − 441,858) ÷ 40 people). A 20-person Send averages about 39,000 per person, including the fee transfer.
- **Fast enough for in-person tipping.** Every transaction went from submit to receipt in 1.9–2.6 seconds.

## Limits

- **Small sample.** Two runs each, on one day, from one laptop. Times include the public endpoint's network round trips and the 200 ms polling step.
- **Testnet prices.** MON costs are at testnet gas prices, and the test MON has no value. Mainnet prices will differ.
- **Price swings.** The two 100-person payouts used identical gas but cost 0.4555 and 0.3707 MON, because the gas price moved between them.
- **Worst case only.** Recipients that already hold the token cost less than the fresh wallets measured here.
