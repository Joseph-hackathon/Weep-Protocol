# Security policy

Weep is a testnet preview: its contracts run on Monad testnet with test dollars, and they have not been independently audited. We still want to hear about every problem.

## What's in scope

| Area | Where |
|---|---|
| WeepPay contract | [`contracts/contracts/WeepPay.sol`](contracts/contracts/WeepPay.sol), `0xa0209c2245FdD5928a7a602a2d4c7d4239CF5A26` on Monad testnet |
| WeepPools and TipPool contracts | [`WeepPools.sol`](contracts/contracts/WeepPools.sol), `0x5b9f33a6db109314f4720dd28a5bed9C1Ef53210`, and every pool it creates · [`TipPool.sol`](contracts/contracts/TipPool.sol) |
| TipSplitter contract | [`contracts/contracts/TipSplitter.sol`](contracts/contracts/TipSplitter.sol), `0x06db4c849EF42653982694Ae924dC99DBB80EA35` on Monad testnet |
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
- Each business's pool is controlled only by its owner (or an agent it names): team, split and payouts. WeepPools has no owner. These trust boundaries are described in [docs/architecture.md](docs/architecture.md#trust-boundaries).
- The sponsor key that covers first fees lives only in the host's environment settings, and the route spends it only on signed-in people's own new email wallets.
