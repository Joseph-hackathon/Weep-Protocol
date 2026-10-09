# Handoff: Weep is live

Weep on X: [@WeepProtocol](https://x.com/WeepProtocol). Deadline: Monad Metropolis, **13 Oct 2026, 11:59 PM ET**.

## What you do now, in order

1. **Merge the pull request** "Add Chainlink CRE". Vercel redeploys on its own; wait for **Ready**. No new Vercel setting is needed: the app already knows the registry address.
2. **Record the video** from the 2:50 script in `Weep_Submission_Kit.md` (it's outside the repo, next to it). Record at 1440 × 900, in one uncut take of the payment. Keep a **backup recording** too. Upload to YouTube or Loom as public or unlisted, and check that it plays when you're signed out.
3. **Update the portal submission** at hackathon.monad.xyz:
   - the kit's text;
   - the video link;
   - the X link;
   - the contract addresses and example transactions (both in the kit);
   - the bounties: Privy, Chainlink CRE, and Agora (with the stand-in note).

   Then screenshot the confirmation.
4. **Final check in a private window:** the live site, the GitHub repo, the video, x.com/WeepProtocol, and one explorer link from the README.
5. **Delete the private keys** on your computer:
   - in `contracts\.env`, the `PRIVATE_KEY` and `GAS_SPONSOR_KEY` lines;
   - in `cre\.env`, the `CRE_ETH_PRIVATE_KEY` line.
   - **Wait until judging is over** (27 Oct) before removing the `GAS_SPONSOR_KEY` value from Vercel. Without it, new email users are sent to the faucet.
   - **After the hackathon,** stop using wallet `0xf857…` for anything that matters: its key was once pasted into Vercel.

Optional:
- **Show "Read by Chainlink CRE" in the video.** The line appears only for the business whose pool was attested, when it types the exact description that was attested.
  1. Sign in on the Merchant Portal with the account you'll record with, and copy its wallet address from the account menu.
  2. Put that business's pool address (`WeepPools.poolOf` for that wallet, or `predict` if it has no pool yet) and the exact description you'll type into `cre/weep-policy/payload.example.json`.
  3. Run the simulate command in [cre/README.md](cre/README.md) again.
- **First pool's $8.** Joseph can return the $8 of test dollars left in the very first pool (`0x1A24…F336`): with his own key in his `contracts\.env`, he runs `$env:RETURN_TO="0x…"; npx.cmd hardhat run scripts/retire-first-pool.js --network monadTestnet`. Nothing in the app uses that pool.
- **Covered fee, live.** Sign in on the live Send page with a brand-new email and send something small. Then check that the sponsor wallet `0x8DF6B06B2262AF394DB65eCdA8105841eD3e4927` dropped by about 0.1 MON. It's set up and the route answers, but no real email user has used it yet (see the gaps below).

## What's live

| | |
|---|---|
| Site | https://weep-protocol.vercel.app (built from `main`) |
| WeepPay | `0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5`: 0.3% fee on top, verified on MonadVision |
| WeepPools | `0xd2bd0685941DAe339D9E28224a5a912FBEb56317`: 0.5% fee on tips, verified |
| TipPool template | `0x510065532A1CA0DF6316e52f33DC34e6780305Ec`: verified, locked |
| Fee recipient | `0xf857184004D6f7c78D89577595baCd6113a4f6E1` |
| Fee-cover sponsor | `0x8DF6B06B2262AF394DB65eCdA8105841eD3e4927`, funded with 5 test MON. Its key is only in Vercel and in your `contracts\.env` |
| WeepPolicyRegistry | `0x6437a6BD79d388E70f726Fee9f15f3d0245ddc9c`: Chainlink CRE's records of team setups, verified. Trusts Chainlink's simulation forwarder |
| Retired | Shared pool `0x06db…EA35`: empty, unlinked. First pool `0x1A24…F336`: unlinked; $8 left (optional step above) |

## Evidence, 9 Oct 2026

- **Live loop on the live contracts:** 19 of 19 balance checks passed, run by [`contracts/scripts/live-loop.js`](contracts/scripts/live-loop.js) with fresh test wallets. I also read every transaction back independently from Monad.

  | Step | Transaction | Result |
  |---|---|---|
  | Create a pool | [tx](https://testnet.monadexplorer.com/tx/0x61f67c67a6df32c23a5f4d9c6108873e872256a7538317173c68aebeced656d3) | Sam floor, Ama kitchen, Kai bar; split 60/30/10 |
  | Named tip | [tx](https://testnet.monadexplorer.com/tx/0xe234cff970cf264928ee4b3d0d59e7d579acfc1a8aa7cc08ee92439d7c6f0190) | Sam got $5.00, Weep got $0.025, the pool kept $0 |
  | Team tip | [tx](https://testnet.monadexplorer.com/tx/0xc3fe16a8ecd0b4a0960169a54333a84ca8ab49027736b61b2eda5501022647f1) | The pool got $10.00, Weep got $0.05 |
  | Payout by a different wallet | [tx](https://testnet.monadexplorer.com/tx/0x90111369274b6e5cf02b7610707ed9b6c159da3921dcb72411f270d39a0eca99) | Sam $6.00, Ama $3.00, Kai $1.00; the caller got $0; the pool ended empty |
  | Send $100 | [tx](https://testnet.monadexplorer.com/tx/0x6f4558cbc4837385f5d5b198cdf2059d571d223fb382d014ab9159786b71b3c0) | $33.34 / $33.33 / $33.33 delivered, $0.30 fee, WeepPay kept $0 |

- **Chainlink CRE:** `cre workflow simulate --broadcast` on CRE CLI v1.38 read the example description with Gemini in about 2 seconds, then wrote a DON-signed report through Chainlink's forwarder: [transaction](https://testnet.monadexplorer.com/tx/0x3803dec912c6d9d4af4776f252f40cb0d712e87bde554e29f3c3f3adf9f77ac3). We read it back from Monad: Sam and Ama (floor), Kai (kitchen), 70/30/0, no emails. On a local chain, the Merchant Portal showed the CRE line only when the review matched the record, and hid it after any edit (checked at 390 and 320 px).
- **Live website, read-only:** the tip page for that pool lists Sam, Ama and Kai and shows "+ $0.025 Weep fee (0.5%) · Sam gets 100%" before signing. Sam's Employee Dashboard shows $11.00.
- **AI on the live site:** 14 of 14 messy descriptions read correctly one at a time, and 14 of 14 answered when all were sent at once. Before the retry fix, 3 failed when sent at once. Each answer took 4–30 seconds.
- **Benchmarks:** see [docs/benchmarks.md](docs/benchmarks.md). A payout to 100 people is 3.6M gas (about 2.4% of a block) and costs about 0.37–0.46 test MON. Every transaction confirmed 1.9–2.6 seconds after submitting.
- **Tests:** 36 contract tests (30 earlier ones covered 100% of lines and functions and 90.91% of branches; 6 new ones cover WeepPolicyRegistry), plus 7 tests for the CRE workflow's checks. Plus 7 app tests, including 5,000 random payment plans. Typecheck, lint and the production build are clean.
- **Phones:** checked at 375px wide on the live site: the landing page, Merchant Portal, tip card, Send and How money moves, all with no sideways scroll.

## Score against the 100-point audit

Scored honestly, with evidence for each line. Each dimension is scored 0–4, and the points are weight × score ÷ 4.

| Dimension | Weight | Score | Points | Evidence | What would raise it |
|---|---|---|---|---|---|
| Problem, differentiation, positioning | 15 | 4 | 15 | Sourced problem (Pew, URocked), one concrete scenario, before/after table, honest alternatives, a business model with fixed fees | — |
| Working end-to-end product | 25 | 3.5 | 21.9 | Live contracts; the full loop with 19 exact checks; the real pages show the pool, the fee and the dashboard | The loop ran by script with test wallets, not by a human signing in with email on the live site |
| Necessity and proof of Monad use | 15 | 3 | 11.3 | One-transaction payouts to 100 people at 2.4% of a block; about 2 s to confirmation; verified source | A head-to-head comparison with another chain |
| Security, trust, failure handling | 20 | 3.5 | 17.5 | Fees fixed in code; reviewed fee and wallet checks; re-entrancy guards; no owner on the payment contracts; tested failure paths; failure table in the docs | An independent audit |
| First-time user experience | 10 | 3.5 | 8.8 | Email sign-in, first fee covered, exact review, fee shown before signing | The covered fee isn't yet exercised by a real email user; AI answers take up to 30 s |
| Documentation, evidence, demo | 10 | 3.5 | 8.8 | README with a two-minute proof path, evidence table, benchmarks, architecture, API, Terms, Privacy, How money moves | The video (step 2): 4 out of 4 once it's recorded |
| Adoption and next step | 5 | 2 | 2.5 | Business model; two pilots planned, measured by clear metrics | A real pilot or a letter of intent from a venue |
| **Total** | 100 | | **≈ 86** | | **≈ 88 once the video is in** |

## Honest gaps

- **Not audited.** The contracts are tested (30 tests, 100% of lines) but haven't been independently audited. It's a testnet preview, and the test dollars and fees have no value.
- **No real pilot yet.** No venue or community has used Weep. The pilots in the README are plans.
- **Covered fee not exercised.** No real email user has used the first-fee cover on the live site yet. The route is configured (it answers a signed-out request with 401, not 503) and the sponsor is funded.
- **CRE runs as a simulation.** The workflow runs through Chainlink's official CLI and writes real transactions to Monad testnet, but it isn't deployed to the Chainlink network itself. That needs Chainlink to approve deploy access (`cre account access`). The live site doesn't trigger it yet; it reads the records.
- **Recent payments list.** The dashboards list only payments from about the last 100 blocks; older ones show in the balance.
- **AI speed.** The AI can take up to about 30 seconds to read a description.

## Decisions log

- **Fees.**
  - 0.3% on WeepPay and 0.5% on tips, paid on top, so recipients get 100%.
  - The rate and recipient are fixed at deployment, and anything above 1% is refused.
  - The fee is rounded down, and the payer's reviewed fee must match.
  - Fees go to `0xf857…`, because the user chose the deployer wallet.
- **Pools.**
  - One pool per business, created by the factory as a clone, owner-only `configure`, no `agent` role.
  - Anyone can pay out, and only to the saved team.
  - Named tips check the wallet the guest saw; the team is capped at 100; token-moving functions are guarded against re-entry.
- **Old pools.** The shared pool is retired (empty). The first pool belongs to Joseph's wallet `0xF11D…`, so its $8 can only be returned by him.
- **Production guard.** A production build stops without `NEXT_PUBLIC_WEEP_PAY` and `NEXT_PUBLIC_WEEP_POOLS`. On 9 Oct it correctly kept the old site live until those were set.
- **Sponsor key.** `create-sponsor.js` writes the key only to `contracts/.env`, which git ignores, and never prints it. The user copied it into Vercel.
- **Chainlink CRE.** It reads team setups (Joseph's design). It's a record with no power: it can't touch a pool, and the business still saves its own team. First names go onchain only, never emails. It uses Gemini Flash-Lite, because CRE stops HTTP requests at 10 seconds.
- **Nansen.** Dropped: the old route was never called, returned made-up scores, and looked up Ethereum, not Monad.
- **Document links.** They're in the footer on every page, and removed from the account menu so they appear only once.
- **Assistant files.** Generated assistant files are kept out of git through `.git/info/exclude`, never through a committed ignore entry.
- **Who ran what.** The user ran the contract deploy, the verify commands and the sponsor funding. The live loop and benchmarks ran from this machine with the deployer's test MON.
