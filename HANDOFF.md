# Handoff: business model, safer pools and final cleanup

Weep on X: [@WeepProtocol](https://x.com/WeepProtocol). It's linked from every page footer, the README and the share card.

## What you do, in order

**1. Submit the current version in the Monad portal today, and screenshot the confirmation.**
The live site doesn't charge a fee yet. In today's text, either leave the business model out, or say it ships with the next contract deploy.

**2. Merge the pull request "Business model, safer pools and final cleanup".**
Safe to do at any point. Vercel will try to build production straight away, and that build **stops on purpose** until step 5 is done (see `frontend/next.config.ts`). The current live site stays up in the meantime.

**3. Run the tests, deploy the contracts, and verify them.** On your computer:

```bash
cd contracts
npm install
npm test                 # expect: 30 passing
npx hardhat coverage     # expect: 100% lines, about 91% branches
```

Put the deployer's key in `contracts/.env` as `PRIVATE_KEY=…`. That file is git-ignored; never commit it or paste it anywhere. The deployer needs about 1 test MON. Then choose the address that should receive Weep's fees, and deploy:

```bash
# Git Bash / macOS / Linux
FEE_RECIPIENT=0xYourFeeAddress npx hardhat run scripts/deploy-all.js --network monadTestnet
```

```powershell
# PowerShell
$env:FEE_RECIPIENT="0xYourFeeAddress"; npx hardhat run scripts/deploy-all.js --network monadTestnet
```

The script prints two `NEXT_PUBLIC_*` lines and three `npx hardhat verify …` commands. Run the three verify commands; they publish the source on MonadVision with no API key needed.

**4. Retire the old shared pool** (TipSplitter `0x06db…EA35`). Run it from its owner, which is the same deployer key:

```bash
RETURN_TO=0xWhereTheLeftoverShouldGo npx hardhat run scripts/retire-shared-pool.js --network monadTestnet
```

It moves whatever the pool still holds to `RETURN_TO` in one payout, and does nothing if the pool is empty. The app no longer links to this pool.

**5. Set the Vercel variables (Production), then redeploy.**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_WEEP_PAY` | from step 3 |
| `NEXT_PUBLIC_WEEP_POOLS` | from step 3 |
| `GAS_SPONSOR_KEY` | the private key of a **new** wallet used only to cover first fees. Fund it with about 5 test MON first. |

Delete `NEXT_PUBLIC_TIP_SPLITTER`; nothing reads it any more. Then trigger a redeploy. The build now passes.

**6. Run the full loop on the live site, then fill in the transaction hashes.** Use a fresh browser profile and two or three email addresses you control:

1. Merchant Portal: describe a team and save. **Create** a pool.
2. Open the table code and tip one person by name. Check the 0.5% fee line before signing. **Named tip.**
3. Tip the whole team. **Team tip.**
4. From a *different* wallet, open the code, then *Split details* → **Pay out the team**. **Payout.**
5. Sign in as a staff member: the Employee Dashboard shows "from team tips".
6. Send $100 to three people. Check that the review shows the $0.30 fee. **Send.**

Then replace every placeholder (`git grep -n "TODO_"` lists them):

- `README.md`: `TODO_ADDR_WEEPPAY`, `TODO_ADDR_WEEPPOOLS`, `TODO_ADDR_TIPPOOL` (the template printed by step 3); `TODO_TX_SEND`, `TODO_TX_POOL`, `TODO_TX_NAMED_TIP`, `TODO_TX_TEAM_TIP`, `TODO_TX_PAYOUT`. Also turn each "MonadVision" in the Contracts table into a link: `https://testnet.monadvision.com/address/<address>`.
- `frontend/src/app/how-money-moves/page.tsx`: set `PROOF_TX` to the **Send** hash. The example paragraph only appears once it's a real hash.
- `Weep_Submission_Kit.md` (outside the repo): the two contract addresses.

Commit the result. It's a docs-only change.

**7. Record the video, and update the portal submission** with the business model and the final links.

## Decisions

- **Fees.**
  - WeepPay charges 30 bps, and WeepPools gives every pool 50 bps.
  - Each rate and the recipient are fixed at deployment: `immutable` in WeepPay and WeepPools. A pool copies them once, in `initialize`, from the factory's immutables.
  - Contracts refuse rates above 100 bps, and refuse a non-zero rate with no recipient.
  - Fee = `amount × bps / 10_000`, rounded down. The payer passes `expectedFee` and the contract reverts on any mismatch.
  - The fee is pulled in the same transaction, so any failure reverts everything.
- **Fee on WeepPay is charged on the total** rather than per recipient, so one rounding happens per payment.
- **Pools read their settings from the factory.** The token and fee settings are read from `msg.sender` (the factory) inside `initialize`, rather than passed as arguments. Passing them overflowed the compiler's stack ("stack too deep"), and reading them means a pool can only ever take the factory's fixed values. Clones are created and initialised in one transaction, and the template is locked, so no one else can initialise a pool.
- **`agent` removed.** Nothing in the app ever set one; the server only read it. Only the owner can `configure` a pool now. `setTeam` and `updatePolicy` were folded into `configure`.
- **`payoutTeam()` is open to anyone.** It can only pay the saved team by the saved split, and the caller receives nothing. The Customer page shows who gets what before the button.
- **Named tips carry `expectedWallet`.** The pool reverts with "Recipient changed" if the name was repointed after the guest reviewed it.
- **Re-entrancy guard** (OpenZeppelin `ReentrancyGuard`) on `pay`, `tipIndividual`, `tipTeam` and `payoutTeam`. Clones start with the guard's storage slot at 0, which the guard treats as "not entered". A hostile test token proves re-entry reverts.
- **Team cap of 100,** enforced by both `create` and `configure`.
- **No shared pool.**
  - `TipSplitter.sol`, its test and its deploy scripts are deleted, not moved: keeping it in `legacy/` would have kept the Nansen and `distributeTips` references the brief asked to remove.
  - The retire script uses a minimal inline ABI.
  - `/customer` without a table code now asks for one.
- **Contract addresses come from the environment.** The code defaults are the zero address, and a production build stops without both addresses. Vercel keeps the last good deployment when a build fails, so a half-configured release can't go live.
- **Fee display is exact.**
  - Shown before signing: the Send summary and a line under the tip amount.
  - Shown to 5 decimals where needed. 0.3% of $33.33 is shown as $0.09999, never rounded up.
  - Receipts read the fee from the transaction's own `Transfer` logs.
- **Removed `chainlink-cre/` and `cre-workflow/`.**
- **Removed two instruction files that the dev server writes for coding assistants.** They're no longer tracked. `next dev` writes them again into `frontend/`, so leave them out of commits.
- **`contracts/.gitignore`** ignores the coverage output.

## What was checked, and where

- **Contracts:** 30 tests pass. Coverage is 100% of lines and functions, and 90.9% of branches. Uncovered: a "no owner" check that can't be reached through the factory, and zero-fee branches.
- **App:** 7 tests pass, including 5,000 random payment plans. Typecheck and lint are clean.
- **Production build:** passes with the addresses set, and stops without them. Both cases were run.
- **The real screens, end to end,** in a headless browser with test wallets, against a local chain running the new contracts. After the first named and team tip, the local fee recipient held exactly $0.075 ($0.025 + $0.05).
  - Merchant Portal creates a pool in one confirmation.
  - A named $5 tip shows "+ $0.025 Weep fee (0.5%) · Sam gets 100%" and its receipt reads $0.025 from the chain.
  - A $10 team tip shows the $0.05 fee.
  - A stranger pays the team out from *Split details*: the team receives everything, the stranger receives nothing.
  - Send $100 shows "Plus $0.30 Weep fee (0.3%) on top", and its receipt reads $0.30.

## Not done, or not checkable here

- **Nothing is deployed and no transaction was sent on testnet** for this work, as the brief required. Every testnet address and hash in the docs is a `TODO_` placeholder until steps 3 and 6.
- **The older contracts stay on testnet** (WeepPay `0xa020…`, WeepPools `0x5b9f…`, TipSplitter `0x06db…`, and the very first pool `0x1A24…F336`, which still holds about $8 of test dollars). The app stops using them once step 5 is done. The very first pool isn't covered by the retire script.
- **Commit `d16890c` never reached `main`.** PR #9 was merged before it was pushed. It reaches `main` with this pull request.
- **Still to retest after step 5:**
  - the AI under a burst of requests;
  - email sign-in with a real inbox;
  - the covered first fee.
