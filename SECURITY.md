# Security policy

Weep is a testnet preview: its contracts run on Monad testnet with test dollars, and they have not been independently audited. We still want to hear about every problem.

## What's in scope

| Area | Where |
|---|---|
| WeepPay contract | [`contracts/contracts/WeepPay.sol`](contracts/contracts/WeepPay.sol), at the address in the README's Contracts table |
| WeepPools and TipPool contracts | [`WeepPools.sol`](contracts/contracts/WeepPools.sol) and every pool it creates · [`TipPool.sol`](contracts/contracts/TipPool.sol) |
| Server routes | [`api/send/`](frontend/src/app/api/send), [`api/setup/`](frontend/src/app/api/setup) and [`api/gas/`](frontend/src/app/api/gas) |
| The website | https://weep-protocol.vercel.app |

The latest commit on `main` is the only supported version.

## Report a problem privately

1. [Open an issue](https://github.com/Joseph-hackathon/Weep-Protocol/issues/new) titled **"Security report"** with no details in it. We'll reply there with a private way to send them.
2. Then send us the affected contract, route or page, what an attacker could do, steps to reproduce it, and the smallest example that shows it.

Please don't disclose the problem publicly, or use it against other people's wallets, until it's fixed. Testing against your own wallets on testnet is fine.

## What happens next

We acknowledge reports as soon as we can, keep you updated while we fix them, and credit you in the [changelog](CHANGELOG.md) unless you'd rather we didn't.

## What we rely on

- No private keys or secrets are stored in this repository. Server secrets live in the host's environment settings, and `contracts/.env` is git-ignored.
- WeepPay has no owner and can only move funds a sender has explicitly allowed.
- Fees are fixed at deployment (at most 1%), paid on top, and every payment or tip must carry the fee the payer reviewed.
- Only a pool's owner can change its team and split. Anyone can pay a pool out, but only to the saved team. A named tip is refused if the name points to a different wallet than the guest saw. WeepPools has no owner.
- Every function that moves tokens is guarded against re-entrancy, and tested with a hostile token. These trust boundaries are described in [docs/architecture.md](docs/architecture.md#trust-boundaries).
- The sponsor key that covers first fees lives only in the host's environment settings, and the route spends it only on signed-in people's own new email wallets.
