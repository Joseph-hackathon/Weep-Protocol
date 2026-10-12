# Security policy

Weep is a testnet preview: its contracts run on Monad testnet with test dollars, and an independent audit is the next step. We welcome every report.

## What's in scope

| Area | Where |
|---|---|
| WeepPay contract | [`contracts/contracts/WeepPay.sol`](contracts/contracts/WeepPay.sol), at the address in the README's Contracts table |
| WeepPools and TipPool contracts | [`WeepPools.sol`](contracts/contracts/WeepPools.sol) and every pool it creates · [`TipPool.sol`](contracts/contracts/TipPool.sol) |
| Server routes | [`api/send/`](frontend/src/app/api/send), [`api/setup/`](frontend/src/app/api/setup) and [`api/gas/`](frontend/src/app/api/gas) |
| The website | https://weep-protocol.vercel.app |

The latest commit on `main` is the only supported version.

## Report a problem privately

1. [Open an issue](https://github.com/Joseph-hackathon/Weep-Protocol/issues/new) titled **"Security report"**, keeping the details for the private channel. We'll reply there with a private way to send them.
2. Then send us the affected contract, route or page, what an attacker could do, steps to reproduce it, and the smallest example that shows it.

For everything else, you can also reach us on X at [@WeepProtocol](https://x.com/WeepProtocol). Please send security details through GitHub as above.

Please keep the problem private until it's fixed, and test with your own wallets on testnet.

## What happens next

We acknowledge reports as soon as we can, keep you updated while we fix them, and credit you in the [changelog](CHANGELOG.md) if you'd like.

## What we rely on

- Private keys and secrets stay out of this repository. Server secrets live in the host's environment settings, and `contracts/.env` is git-ignored.
- WeepPay is ownerless and moves exactly the funds a sender has allowed.
- Fees are fixed at deployment (at most 1%), paid on top, and every payment or tip must carry the fee the payer reviewed.
- Only a pool's owner can change its team and split. Anyone can pay a pool out, always to the saved team. A named tip goes to the wallet the guest saw. WeepPools is ownerless.
- Every function that moves tokens is guarded against re-entrancy, and tested with a hostile token. These trust boundaries are described in [docs/architecture.md](docs/architecture.md#trust-boundaries).
- The sponsor key that covers first fees lives only in the host's environment settings, and the route spends it only on signed-in people's own new email wallets.
