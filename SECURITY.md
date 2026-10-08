# Security policy

Weep is a testnet preview: its contracts run on Monad testnet with test dollars, and they have not been independently audited. We still want to hear about every problem.

## What's in scope

| Area | Where |
|---|---|
| WeepPay contract | [`contracts/contracts/WeepPay.sol`](contracts/contracts/WeepPay.sol), `0xa0209c2245FdD5928a7a602a2d4c7d4239CF5A26` on Monad testnet |
| TipSplitter contract | [`contracts/contracts/TipSplitter.sol`](contracts/contracts/TipSplitter.sol), `0x06db4c849EF42653982694Ae924dC99DBB80EA35` on Monad testnet |
| Server routes | [`frontend/src/app/api/send/`](frontend/src/app/api/send) and [`frontend/src/app/api/setup/`](frontend/src/app/api/setup) |
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
- TipSplitter's owner or agent controls each business pool's team, split and payouts. That's a deliberate trust boundary, described in [docs/architecture.md](docs/architecture.md#trust-boundaries).
