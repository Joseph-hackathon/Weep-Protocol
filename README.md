<div align="center">
  <img src="./frontend/public/logo.png" alt="Weep" width="96" />
  <h1>Weep</h1>
  <p><b>Pay a whole group at once, to the exact cent.</b></p>
  <p>Say who gets what in plain words. Check every amount. Everyone is paid in one Monad transaction, even people who only have an email.</p>
  <p>
    <a href="https://weep-protocol.vercel.app">Try it live</a> ·
    <a href="#verify-it-in-two-minutes">Verify it in two minutes</a> ·
    <a href="https://weep-protocol.vercel.app/how-money-moves">How money moves</a> ·
    <a href="https://x.com/WeepProtocol">@WeepProtocol on X</a>
  </p>
  <p><sub>Testnet preview · Monad testnet (chain ID 10143) · Test dollars · Independent audit next</sub></p>
</div>

---

## The problem

When one payment has to be shared among several people (a tip for the staff, prize money, a split bill), someone ends up doing the maths, moving the money person by person, and asking to be trusted.

- Tipping is now expected in more places, but the rules feel unclear. 72% of U.S. adults say tipping is expected in more places than five years ago, and only about a third find it easy to know whether (34%) or how much (33%) to tip. ([Pew Research Center](https://www.pewresearch.org/2023/11/09/tipping-culture-in-america-public-sees-a-changed-landscape/), 11,945 U.S. adults, August 2023)
- People doubt tips reach staff. 54% of consumers don't trust restaurants to pass tips on. ([URocked research via Restaurant Online](https://www.restaurantonline.co.uk/Article/2025/10/01/half-of-consumers-still-dont-trust-restaurants-to-pass-on-tips-according-to-new-research/), 1,000 UK consumers, October 2025)

**One scenario.** After a gig, the crowd tips $340. The band agrees the drummer gets $100 and the other two split the rest. Today someone works out $120 each, sends three separate transfers, and the others take it on trust. With Weep, they type exactly that sentence, see $100 / $120 / $120, and one transaction pays all three. Each of them can open the same public receipt.

| | Today | With Weep |
|---|---|---|
| Working out the shares | By hand or in a spreadsheet | Code works out every cent; you check it |
| Paying | One transfer per person | One transaction for up to 100 people |
| Paying someone new | Ask for their bank or wallet details | Their email is enough |
| If something fails halfway | Some people get paid, others wait | Everyone is paid together, or the whole payment stays with you |
| Proof | Take the organiser's word | A public receipt anyone can open |

**Alternatives, honestly.**
- **Payment apps** (Venmo, Cash App) pay one person per payment, and you do the maths.
- **Expense splitters** (Splitwise) work out who owes what, but the money still moves separately.
- **Tip-pool spreadsheets** leave staff unable to check their share.

Weep does the maths, the payment and the proof in one step.

## What Weep does

Weep has two sides that share the same three slots, and people choose where to go.

| | Individual | Business |
|---|---|---|
| **Pay** | **Send**: describe a payment in words ("$60 to Sam, Ama and Kai, Sam gets half"), check the exact amounts, pay everyone in one transaction. | **Merchant Portal**: describe the team once. One confirmation creates the business's own tip pool on Monad with its team and split. |
| **Receive** | **My money**: your balance, every payment in (how much, from whom, when) and your own pay-me link and QR code. | **Employee Dashboard**: every tip as it lands, including tips from individuals, plus a personal tip link. |
| **Tip** | **Tip**: scan or paste a code or link and land exactly where it points. | **Customer**: the business's table code opens its own pool. Tip one person by name (100% to them) or the whole team. Anyone can pay the team out. |

What sets it apart:

- **Exact.** Weep's own code works out every share to the cent, and the shares always add up to the total. The contract accepts a payment only when its parts match the total you reviewed.
- **All at once.** One WeepPay transaction pays up to 100 people together, or the whole payment stays safely with you.
- **Recipients get 100%.** Weep's small fee is shown before you sign and paid on top, so every share arrives in full.
- **Anyone can be paid.** An email is enough. The money lands in a non-custodial wallet tied to that email, ready the moment they sign in.
- **Staff get paid on time.** Anyone can pay a team's pool out, and it always goes to the saved team, by the saved split.
- **Nothing to take on trust.** Receipts are read back from Monad, and every amount links to its transaction.
- **Simple sign-in.** An email code or a passkey (fingerprint, face or screen lock). Weep covers a new account's first network fee.

## Business model

Weep charges a small fee on the money it moves. The payer pays it on top, so recipients and staff always receive 100% of the stated amount.

| Where | Fee | Example |
|---|---|---|
| Personal payments (Send, WeepPay) | **0.3%** | Paying $100.00 to three people costs the sender $100.30 |
| Business tips: named and team (TipPool) | **0.5%** | A $10.00 team tip costs the guest $10.05; the team receives $10.00 |

- **Fixed in code.** Each rate and its recipient are set when the contract is deployed and stay fixed, with rates capped at 1%. The fee is worked out on-chain (`amount × rate`, rounded down) and matches the fee the payer reviewed.
- **Revenue = fee × volume.** Illustration: 200 venues each passing $20,000 of tips a month would be $4 million a month in volume, or $20,000 a month in fees at 0.5%.
- **Planned next:**
  - business plans (exports, multiple venues);
  - fee-free payouts to staff in local currency, through a partner.

On testnet the fee is paid in test dollars.

## Verify it in two minutes

1. **Open the live app.** Go to [weep-protocol.vercel.app](https://weep-protocol.vercel.app), choose **Get started**, keep **Individual**, and open **Send**.
2. **Describe a payment.** Paste `$100 split equally between ama@example.com, kai@example.com and sam@example.com` and press the arrow button. Weep shows $33.34, $33.33 and $33.33, notes that one person gets 1¢ more so it's exact, and shows the $0.30 Weep fee on top.
3. **Send it.** Sign in with any email. Weep covers the network fee and adds test dollars if you're short, then pays all three in one transaction and shows the receipt, with the fee read back from Monad. If you connect your own wallet instead, it needs a little test MON from the [Monad faucet](https://faucet.monad.xyz).
4. **Check the chain.** Open the receipt link, or inspect our own run: [a $100.00 payment to three people, plus the $0.30 fee](https://testnet.monadexplorer.com/tx/0x6f4558cbc4837385f5d5b198cdf2059d571d223fb382d014ab9159786b71b3c0). The explorer shows $33.34, $33.33 and $33.33 arriving, and $0.30 going to Weep.
5. **Try the business side.** Switch to **Business** and open the **Merchant Portal**. Describe a team, for example `Sam (sam@example.com) and Ama (ama@example.com) serve, Kai (kai@example.com) cooks, 70% floor 30% kitchen`. Save it, and one confirmation creates your own pool. **See what customers see** opens your table code.
   - Tip Sam by name, or tip the team. Each shows its 0.5% fee first.
   - Open **Split details** and pay the team out. Anyone can do this.
6. **Read the contracts.** Every contract's source is verified on MonadVision (see [Contracts](#contracts)).
7. **Run the tests.**
   - `cd contracts && npm install && npm test` gives 39 passing tests.
   - `npx hardhat coverage` reports 100% of contract lines and 92.98% of contract branches.
   - `cd frontend && npm test` gives 7 tests, including 5,000 random payment plans.

   See [Evidence](#evidence) for what each covers.

## How it works

```mermaid
flowchart LR
  U["Person in the browser"] -->|"words"| P["/api/send/parse<br/>Gemini drafts rows"]
  P -->|"people + rules"| A["allocate.ts<br/>exact cents"]
  A -->|"review amounts and fee, then approve"| W["Wallet<br/>(Privy or own)"]
  U -->|"emails, signed"| L["/api/send/wallets<br/>Privy: email → wallet"]
  W -->|"one transaction"| C["WeepPay on Monad"]
  C -->|"exact amounts"| R["Each person's wallet"]
  C -->|"fee on top"| F["Weep's fee recipient"]
  C -.->|"Transfer logs"| U
```

- **The AI reads; you decide.** Gemini turns words into rows: who, how to reach them, and whether their share is fixed, a percentage or equal. Weep's own code does the maths, and you approve every payment.
- **Amounts are deterministic.** Fixed amounts come first, then percentages rounded down to the cent, then equal shares of the rest. Leftover cents go one each to the first people. ([allocate.ts](frontend/src/app/allocate.ts))
- **Emails become wallets on request.** The sender signs one fresh message naming the emails, and the server asks Privy for each person's wallet, creating it if needed. ([route](frontend/src/app/api/send/wallets/route.ts))
- **One transaction pays everyone.** Your wallet allows exactly the reviewed total plus the fee. `WeepPay.pay` moves each amount straight from you to each person, then the fee, and refuses any total or fee other than the ones you saw. ([WeepPay.sol](contracts/contracts/WeepPay.sol))
- **Receipts come from the chain.** The receipt is built from the transaction's own `Transfer` logs, fee included, exactly as Monad recorded them.
- **Every business gets its own pool.** `WeepPools.create` makes a minimal clone of `TipPool` with the team and split in one transaction, owned by the business's wallet. The address is known in advance, so its team's wallets can be approved first. A named tip carries the wallet the guest saw, and is refused if the name was repointed since. ([WeepPools.sol](contracts/contracts/WeepPools.sol), [TipPool.sol](contracts/contracts/TipPool.sol))

- **Team setup can be read by Chainlink CRE.** The [weep-policy workflow](cre) reads a team description with Gemini through Chainlink's network and checks it by the pool's rules. It then records the first names, groups and split on Monad as a DON-signed report, never emails or wallets. When the review matches that record, the Merchant Portal says *Read by Chainlink CRE · attested on Monad*. The record has no power over any pool. ([WeepPolicyRegistry.sol](contracts/contracts/WeepPolicyRegistry.sol), [cre/README.md](cre/README.md))

The full design, every flow, the trust boundaries and failure handling are in [docs/architecture.md](docs/architecture.md).

## Why Monad

- **Paying a whole team in one transaction is practical.** On Monad testnet, a pool payout to 100 never-used wallets took 3,598,866 gas, about 2.4% of Monad's 150,000,000 block gas limit, and cost about 0.37–0.46 test MON. A payout to 10 people cost about 0.045 MON. ([docs/benchmarks.md](docs/benchmarks.md); payouts were measured on 9 Oct on the previous WeepPools, before payouts also cleared the waiting-tips counter, a small fixed cost. The Send measurement is on the current WeepPay.)
- **Fast enough to pay people in person.** Every benchmark transaction went from submit to confirmed receipt in 1.9–2.6 seconds, measured from a laptop through Monad's public endpoint. That's quick enough for a tip at the table or a payout at the end of a shift.
- **It's the standard EVM.** Standard ERC-20 approvals, Solidity, viem and existing wallets work unchanged, so anyone can verify Weep with familiar tools.

## Contracts

| Contract | Purpose | Network | Address | Verified source |
|---|---|---|---|---|
| WeepPay | One payment to up to 100 people, exact and all-or-nothing; 0.3% fee on top, fixed. Ownerless. | Monad testnet (10143) | [`0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5`](https://testnet.monadexplorer.com/address/0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5) | [MonadVision](https://testnet.monadvision.com/address/0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5) · [WeepPay.sol](contracts/contracts/WeepPay.sol) |
| WeepPools | Gives every business its own tip pool, in one transaction; 0.5% fee on tips, fixed. No owner. | Monad testnet (10143) | [`0xea18adEb9bc624d068eb5ec51fAd66a8FB744996`](https://testnet.monadexplorer.com/address/0xea18adEb9bc624d068eb5ec51fAd66a8FB744996) | [MonadVision](https://testnet.monadvision.com/address/0xea18adEb9bc624d068eb5ec51fAd66a8FB744996) · [WeepPools.sol](contracts/contracts/WeepPools.sol) |
| TipPool | Each business's pool: team, split, named and team tips, payouts anyone can trigger. Cloned per business; owned by that business. | Monad testnet (10143) | template [`0x6823F868EB22510EE5d89bFF14D1BACea4256a06`](https://testnet.monadexplorer.com/address/0x6823F868EB22510EE5d89bFF14D1BACea4256a06) | [MonadVision](https://testnet.monadvision.com/address/0x6823F868EB22510EE5d89bFF14D1BACea4256a06) · [TipPool.sol](contracts/contracts/TipPool.sol) |
| WeepPolicyRegistry | Records the team and split Weep's Chainlink CRE workflow read from a description, as DON-signed reports. Written only by the Chainlink Forwarder; a public record of each team setup. | Monad testnet (10143) | [`0x6437a6BD79d388E70f726Fee9f15f3d0245ddc9c`](https://testnet.monadexplorer.com/address/0x6437a6BD79d388E70f726Fee9f15f3d0245ddc9c) | [MonadVision](https://testnet.monadvision.com/address/0x6437a6BD79d388E70f726Fee9f15f3d0245ddc9c) · [WeepPolicyRegistry.sol](contracts/contracts/WeepPolicyRegistry.sol) |
| AUSD (test) | The 18-decimal test dollar Weep pays in. Anyone can mint. | Monad testnet (10143) | [`0xcEF38D455529Dbc2e37654452C288C25e18ADea4`](https://testnet.monadexplorer.com/address/0xcEF38D455529Dbc2e37654452C288C25e18ADea4) | [MonadVision](https://testnet.monadvision.com/address/0xcEF38D455529Dbc2e37654452C288C25e18ADea4) · [MockAUSD.sol](contracts/contracts/MockAUSD.sol) |

## Run it locally

**You need** Node.js 22.18 or later, a [Privy](https://dashboard.privy.io) app, and a [Gemini API key](https://aistudio.google.com/apikey).

```bash
git clone https://github.com/Joseph-hackathon/Weep-Protocol.git
cd Weep-Protocol/frontend
cp .env.example .env.local   # then fill in the values below
npm install
npm run dev                  # http://localhost:3000
```

| Variable | Needed for | Where it's used |
|---|---|---|
| `NEXT_PUBLIC_WEEP_PAY` | Required: the WeepPay contract | Browser and server |
| `NEXT_PUBLIC_WEEP_POOLS` | Required: the WeepPools contract | Browser and server |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Sign-in and wallets | Browser and server |
| `PRIVY_APP_SECRET` | Paying by email; creating a team's wallets; first-fee cover | Server only |
| `GEMINI_API_KEY` | Reading descriptions in Send and the Merchant Portal | Server only |
| `GAS_SPONSOR_KEY` | Optional: a funded testnet wallet that covers the first fee of email sign-ins. Without it, people are pointed to the faucet | Server only |
| `GEMINI_MODEL`, `NEXT_PUBLIC_AUSD`, `NEXT_PUBLIC_MONAD_RPC` | Optional overrides | Server / browser |

A production build on Vercel requires both contract addresses, so every live deploy is fully configured. Locally the app runs with or without the server keys: without them, Send lets you add people yourself, and email payments show how to switch them on.

**Contracts:**

```bash
cd contracts
npm install
npm test                                       # 39 tests, local chain
npx hardhat coverage                           # line and branch coverage
FEE_RECIPIENT=0x… npx hardhat run scripts/deploy-all.js --network monadTestnet   # needs PRIVATE_KEY in contracts/.env
```

`deploy-all.js` prints the `NEXT_PUBLIC_*` lines to set and the `npx hardhat verify` commands for MonadVision. `contracts/.env` is git-ignored. Never commit a key.

The routes the app calls, with tested examples, are in [docs/api.md](docs/api.md).

## Evidence

Each line says where it was checked: on a local test chain, on Monad testnet, or on the live site.

| What | How it was checked | Where |
|---|---|---|
| A payment lands exactly with the fee on top: each person gets their share ($33.34 / $33.33 / $33.33), the sender pays $100.00 plus $0.30, WeepPay keeps $0 | [Send transaction](https://testnet.monadexplorer.com/tx/0x6f4558cbc4837385f5d5b198cdf2059d571d223fb382d014ab9159786b71b3c0) | Live contracts on Monad testnet, 9 Oct 2026 |
| The business loop: a new business creates its pool (Sam floor, Ama kitchen, Kai bar; 60/30/10). A guest tips Sam $5 (+$0.025 fee), then tips the team $10 (+$0.05 fee). While that $10 waits, the business can't change the split. A different wallet pays out: Sam $6.00, Ama $3.00, Kai $1.00, and the caller gets nothing. The pool ends empty, and only then does the split change to 70/30/0 | [Create](https://testnet.monadexplorer.com/tx/0x81b16bad814a69229a117701833ed807c3f15afe92893f68fa124733bbb7bb80) · [named tip](https://testnet.monadexplorer.com/tx/0x455bfd38ae5cb36800e838b40de17e9377c9ac91ebc7bed9c6a3c6724c3ff62e) · [team tip](https://testnet.monadexplorer.com/tx/0xb29eceeaf16841217df57f7a6e623e97ae0ca2db58fc8108d96fa5f91f02c019) · [payout by anyone](https://testnet.monadexplorer.com/tx/0x855a78d325b2b5fe465289c00b45b47ce6fbc4aa7e210cd602e456e8829a145f) · [split changed after payout](https://testnet.monadexplorer.com/tx/0x9f7bb230715fc3fdc2fa570f3ce7cb20433958e9dd3e3d61c250692d8becbe65) · [Send $100](https://testnet.monadexplorer.com/tx/0x8c394a284864189528df4547f8c1680761f3f5d981139c2d2c4e749fe4975d98) | Live contracts on Monad testnet, 10 Oct 2026. Run with fresh test wallets by [`live-loop.js`](contracts/scripts/live-loop.js), which makes 22 checks, to the unit |
| A brand-new user, signed in with email only, sends $6.00 to two people by email. Weep covers their first network fee, and each person gets $3.00, with a $0.018 fee on top | [Send transaction](https://testnet.monadexplorer.com/tx/0x60c358e7ce571c7b689c615b6c87c089d51cdcf8df28f8c09bdbaa6078ff270d). The sponsor wallet's first transfer, 0.1 test MON, paid that user's fees | Live site, 9 Oct 2026 |
| A brand-new account made with a passkey (fingerprint or PIN) sends $20.00 in AUSD to someone with just their email. Weep covers its first network fee; the recipient's wallet receives $20.00, with the $0.06 fee on top | [Send transaction](https://testnet.monadexplorer.com/tx/0x42fb577f915c8c553fcde3750f9ef6869d36698f7ae30fd23c9c834bf16cb8de), the account's third transaction ever | Live site, 12 Oct 2026 (in the cross-border demo video) |
| The Chainlink CRE workflow run on camera reads a team description (3 people, 70/30/0) and writes a DON-signed report through Chainlink's forwarder to WeepPolicyRegistry | [Attestation transaction](https://testnet.monadexplorer.com/tx/0x6524ac00c9493f7f0ac2364ba4fec3b32ec90bbc953c8b96ebfafbffdd6fee75) | CRE CLI simulation, real Monad testnet transaction, 12 Oct 2026 |
| The live website shows that pool's team and the fee before signing ("+ $0.01 Weep fee (0.5%) · Sam gets 100%" on a $2 tip), and Sam's Employee Dashboard shows $11.00 | The real pages, opened read-only with Sam's address | Live site, 10 Oct 2026 |
| Cost and speed: pool payouts to 10, 50 and 100 people, and a Send to 20 | [`benchmark.js`](contracts/scripts/benchmark.js), 2 runs each; results in [docs/benchmarks.md](docs/benchmarks.md) | Monad testnet, 9 Oct 2026 |
| Fees exact on both contracts and paid on top; recipients get 100%; payer charged amount + fee; rounding down; only the reviewed fee is accepted; fee settings stay fixed; fees capped at 1% at deployment | Contract tests (`contracts/test`) | Local chain |
| A named tip goes to the wallet the guest saw; anyone can pay out, always to the saved team; team capped at 100; a hostile re-entering token is stopped | Contract tests | Local chain |
| All-or-nothing, totals must match, exact allowances, each payment counted once, insufficient funds caught, one pool per business, each pool set up once, gas at 100 recipients | Contract tests: 39 in total, 100% of contract lines and 92.98% of branches covered | Local chain |
| Shares always add up to the total, to the cent | 7 tests, including 5,000 random payment plans (`frontend/src/app/allocate.test.mts`) | Local |
| The same email always gives the same wallet; a forged lookup is refused (401) | Two lookups of two new emails, plus one forged signature | Live site, 8 Oct 2026 |
| The AI reads messy descriptions: paragraphs, "2k", "fifty bucks", fractions, percentages, emails only, wallets, 20 unnamed winners | 14 different descriptions: 14 of 14 read correctly one at a time, and all 14 answered when sent at once. It asked instead of guessing when the total was missing or didn't add up | Live site, 9 Oct 2026 |
| Chainlink CRE reads a team description and attests it on Monad: Gemini through the CRE HTTP capability, checked by the pool's rules, written as a DON-signed report through Chainlink's forwarder. The record is Sam, Ama (floor) and Kai (kitchen), split 70/30/0, with no emails | [Attestation transaction](https://testnet.monadexplorer.com/tx/0x3803dec912c6d9d4af4776f252f40cb0d712e87bde554e29f3c3f3adf9f77ac3), from `cre workflow simulate --broadcast` ([cre/README.md](cre/README.md)) | CRE CLI simulation, real transaction on Monad testnet, 9 Oct 2026 |
| Earlier version (before fees): $100 paid exactly to three people, with the contract keeping $0 | [Transaction](https://testnet.monadexplorer.com/tx/0x8be685ec1e20eee98010745c8bbcaf0fa10d1e08967bd1f811f1c9e5594e44e9) on the previous WeepPay | Monad testnet, 8 Oct 2026 |

## Security and trust

- **Your money stays yours.** Payments go straight from your wallet to each person. WeepPay is ownerless and holds nothing in between, and your wallet allows exactly the reviewed total plus the fee.
- **Fixed fees.** Each contract's rate and recipient are set at deployment (capped at 1%), and every payment or tip carries exactly the fee the payer reviewed.
- **Each business runs its own pool.** A pool's owner sets its team and split. Team tips already waiting are paid out by the rules they arrived under before any change, and tokens sent to a pool directly are simply paid out with the next payout. Anyone can pay a pool out, always to the saved team by the saved split. A named tip goes to the wallet the guest saw. The factory is ownerless.
- **Guarded against re-entry.** Every function that moves tokens is guarded, and tested against a hostile token.
- **Signed requests.** An email lookup carries a fresh signature (under 10 minutes old) from the sender, naming the exact emails. Creating a team's wallets carries the signature of the pool's owner, or of the wallet whose pool will be created at that address.
- **Targeted fee cover.** Weep covers the first network fee of new email and passkey accounts, checked with their Privy session, while keeping a reserve in the sponsor wallet.
- **CRE records are public records.** WeepPolicyRegistry accepts reports from the Chainlink Forwarder set at deployment, checks them by the pool's rules, and stores them for anyone to read.
- **Testnet preview.** The contracts are fully tested (39 tests, 100% of contract lines). An independent audit is the next step before mainnet.

Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Good to know

- Weep runs on Monad testnet with test dollars. Like any on-chain payment, a payment is final once confirmed.
- Every amount is shown for review before you approve it. Reading a description takes a few seconds, and up to about 30 seconds when the AI service is busy.
- People paid by email see their money when they sign in with that email.
- My money and the Employee Dashboard show payments as they arrive, plus what's remembered on the device. Full history is on the [Monad testnet explorer](https://testnet.monadexplorer.com).
- Wallets connected directly (MetaMask and others) use test MON from the faucet for network fees.

## What's next

1. **Real dollars on Monad mainnet,** using Agora's AUSD in place of the test token, after an independent audit. Agora's AUSD on Monad mainnet is `0x00000000eFE302BEAA2b3e6e1b18d08D69a9012a` (6 decimals). WeepPay and WeepPools take their token at deployment, so the move is a new deployment with that address, plus switching the app's unit conversion from the test token's 18 decimals to 6.
2. **Two pilots:**
   - one bar or restaurant team using the tip pool for a month;
   - one community paying out prize money through Send.

   We'd measure time spent splitting, payout delay and disputes, before and after.

## Documentation

| Document | For |
|---|---|
| [How money moves](https://weep-protocol.vercel.app/how-money-moves) | Anyone: where money goes, the fee, what the code guarantees, what the AI does |
| [Terms of use](https://weep-protocol.vercel.app/terms) · [Privacy notice](https://weep-protocol.vercel.app/privacy) | Anyone using the service |
| [docs/architecture.md](docs/architecture.md) | Builders and reviewers: system, flows, trust boundaries, decisions |
| [docs/api.md](docs/api.md) | Developers: the server routes, with examples |
| [cre/README.md](cre/README.md) | Developers: the Chainlink CRE workflow, and how to run it |
| [CHANGELOG.md](CHANGELOG.md) | What was built during the hackathon, by date |
| [SECURITY.md](SECURITY.md) | Reporting a vulnerability |

## Built with

[Monad](https://monad.xyz) for settlement · [Privy](https://privy.io) for passkey and email sign-in, embedded wallets and email-to-wallet lookups ([ConnectModal.tsx](frontend/src/app/ConnectModal.tsx), [providers.tsx](frontend/src/app/providers.tsx), [send/wallets](frontend/src/app/api/send/wallets/route.ts)) · [Gemini](https://ai.google.dev) for reading descriptions ([send/parse](frontend/src/app/api/send/parse/route.ts)) · [Chainlink CRE](https://docs.chain.link/cre) for reading a team description through Chainlink's network and attesting it on Monad ([cre/](cre)) · AUSD (test), a stand-in for Agora's AUSD dollar · Next.js, viem, Hardhat and OpenZeppelin.

## Team

Built for [Monad Metropolis](https://monad.xyz/metropolis), Consumer Products & Payments track, by [Joseph-hackathon](https://github.com/Joseph-hackathon) and [mauyaa](https://github.com/mauyaa).

**Contact:** news and questions on X at [@WeepProtocol](https://x.com/WeepProtocol). Bugs and security reports go through [GitHub issues](https://github.com/Joseph-hackathon/Weep-Protocol/issues), as described in [SECURITY.md](SECURITY.md).

## AI tools

AI coding assistants were used during development; all code was reviewed and tested by the team.

## License

[MIT](LICENSE). The license covers the code. Using the hosted service is covered by the [Terms of use](https://weep-protocol.vercel.app/terms).
