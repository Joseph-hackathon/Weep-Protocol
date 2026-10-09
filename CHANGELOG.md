# Changelog

User-visible changes to Weep, newest first. Everything below was built during Monad Metropolis (1 September – 13 October 2026).

## 2026-10-10: passkey sign-in

### Added
- **Sign in with a passkey.** Weep's sign-in window has *Continue with a passkey*. *Create a passkey* makes a new account with the device's fingerprint, face or screen lock, and Privy creates its wallet. *Use my passkey* signs back in. No password, no code. New passkey accounts get their first network fee covered, like email ones.
- The Privacy notice says what a passkey shares: only its public key, never your fingerprint or face.

### Changed
- **A calmer look.** No glows, pulsing dots or drifting background light. Mint marks only the main action on a screen and money that has arrived. Selected chips, the keypad, links, spinners and the scanner frame are neutral. Focus outlines are one violet everywhere. Text uses three levels instead of six greys. Floor, kitchen and bar use three calm, labelled colours. Layout, flows and wording are unchanged.

## 2026-10-09: waiting tips keep their rules

New WeepPools `0xea18adEb9bc624d068eb5ec51fAd66a8FB744996` and TipPool template `0x6823F868EB22510EE5d89bFF14D1BACea4256a06` on Monad testnet. WeepPay is unchanged. Pools made by the earlier WeepPools no longer open in the app.

### Changed
- **A business can't change its team or split while team tips are waiting.** The pool counts tips received through `tipTeam` (`pendingTips`), and `configure` is refused until they're paid out by the rules they arrived under. Tokens sent to a pool directly don't count, so a stray transfer can't block a change. A pool whose rules pay nobody on its team can still be fixed. Five new tests.
- The Merchant Portal asks the business to pay out waiting tips before changing the team.

## 2026-10-09: Chainlink CRE

WeepPolicyRegistry `0x6437a6BD79d388E70f726Fee9f15f3d0245ddc9c` on Monad testnet, verified on MonadVision. First attestation: [transaction](https://testnet.monadexplorer.com/tx/0x3803dec912c6d9d4af4776f252f40cb0d712e87bde554e29f3c3f3adf9f77ac3).

### Added
- **Team setup read by Chainlink CRE.** A CRE workflow ([`cre/weep-policy`](cre)) reads a team description with Gemini, checks it by the pool's rules, and records the first names, groups and split on Monad as a DON-signed report. Emails and wallets are never part of it.
- **WeepPolicyRegistry.** A Chainlink CRE receiver on Monad that only the Forwarder can write to. It holds no money and has no power over any pool. Six tests cover it.
- **In the Merchant Portal**, the review card says *Read by Chainlink CRE · attested on Monad* when the business's review matches the attested record exactly.
- The Privacy notice and How money moves explain what the workflow records publicly.

## 2026-10-09: live with fees, safer pools and the X account

New contracts on Monad testnet, deployed and verified on MonadVision:
- WeepPay `0x9F24A86a2d35CC9c281Ee87F6A6204aE782BF5F5`, 0.3% fee;
- WeepPools `0xd2bd0685941DAe339D9E28224a5a912FBEb56317`, 0.5% fee;
- TipPool template `0x510065532A1CA0DF6316e52f33DC34e6780305Ec`.

The first shared pool is retired, with nothing left in it. A live loop and benchmarks ran on these contracts; see the README's Evidence section.

### Added
- **Weep on X.** [@WeepProtocol](https://x.com/WeepProtocol) is in the footer of every page, the README and the docs. Shared links show a summary card with its own image.
- **Weep's fee.** 0.3% on personal payments (WeepPay) and 0.5% on business tips (TipPool), paid on top by the payer, so recipients and staff receive 100%. Each rate and recipient is fixed at deployment (at most 1%). Every payment or tip must carry the fee the payer reviewed. The fee is shown before signing, and receipts read it back from Monad.
- **`tipTeam`.** Team tips now go through the pool contract, so the fee is enforced.
- **Payouts by anyone.** Anyone can pay a pool out, from the table code's *Split details*, after seeing who gets what. It only ever pays the saved team.
- **Safer named tips.** A named tip carries the wallet the guest saw, and is refused if the name was repointed since.
- **Re-entrancy guards** on every function that moves tokens, tested with a hostile token. Teams are capped at 100.
- **Scripts.**
  - `deploy-all.js`: both contracts, fees from code, recipient from `FEE_RECIPIENT`.
  - `retire-shared-pool.js` and `retire-first-pool.js`.
  - `create-sponsor.js`: the fee-cover wallet; its key is saved only to `contracts/.env`.
  - `live-loop.js` and `benchmark.js`.
- **30 contract tests**, covering 100% of lines and 90.9% of branches.

### Changed
- `/customer` without a table code asks for one, instead of opening the first shared pool.
- The document links moved from the account menu to the footer, so they're on every page and appear only once.
- A production build stops if the contract addresses aren't set, so a half-configured deploy never goes live.

### Removed
- The `agent` role. Nothing in the app ever set one.
- The first shared pool (TipSplitter) and its test, the old deploy scripts, and two unused workflow experiments.
- Generated coding-assistant files from the frontend folder.

## 2026-10-09 (earlier)

### Added
- **Every business gets its own tip pool.** The Merchant Portal creates the business's pool on Monad, with its team and split, in one confirmation (WeepPools at `0x5b9f33a6db109314f4720dd28a5bed9C1Ef53210`, verified). Table codes and links open that business's pool, checked on Monad first. Anyone can now try the whole business flow.
- **First network fee covered for email sign-ins,** so a first payment, team setup or payout needs nothing but an email. Connected wallets still use the faucet.
- **Nine new contract tests** (28 in total) for pools: one per business, owner-only changes and payouts, no second setup, exact payouts.
- **AI tools note** in the README, as the hackathon rules ask.

### Fixed
- The team-tip preview and receipt now follow the pool's real rule: a group with nobody in it no longer shows a share.
- On laptop screens, the footer no longer overlaps the Merchant Portal and Employee Dashboard cards.

### Removed
- Early experiment routes that returned made-up data, their database files and unused images.

## 2026-10-08

### Added (evening)
- **Contract source verified on MonadVision** (Sourcify) for WeepPay, TipSplitter and AUSD (test).
- **Five new contract tests** (19 in total): no double payouts, nothing lost to rounding, unknown recipients refused, insufficient funds and spent allowances move nothing.
- **App tests for the amount rules** (`npm test` in `frontend`), including 5,000 random payment plans.
- **Document pages** (Terms, Privacy, How money moves) laid out as one reading column, linked quietly from the landing page.

### Changed
- When the AI service is busy, each model now gets one retry before the next takes over, so bursts of requests are less likely to show an error.
- Pages that were opened in a background tab, like a scanned tip code, now read Monad as soon as they're seen, without waiting for the next refresh.

### Added (morning)
- **Individual side.** The role chooser has an **Individual · Business** switch. Individual is the default, and the choice is remembered. It has three screens:
  - **Send**: describe a payment in words, check the exact amounts, and pay everyone in one transaction, by email or wallet.
  - **My money**: your balance, payments in with sender and time, and your own pay-me link and QR code.
  - **Tip**: scan or paste a code or link.
- **WeepPay contract** at `0xa0209c2245FdD5928a7a602a2d4c7d4239CF5A26`. It pays up to 100 people in one transaction, exactly and all-or-nothing, and refuses payments whose parts don't match the reviewed total.
- **Paying by email.** Weep finds or creates each person's Privy wallet. The sender must sign a fresh request.
- **Business side.** The Employee Dashboard now shows who each tip came from and when, and gives staff their own tip link. The Merchant Portal's live screen shows the team's table tip code.
- **Documentation.** Terms of use, Privacy notice and How money moves pages on the website. A new README, architecture and API docs, a security policy and the MIT license.

### Fixed
- The Connect button no longer shows up blank while sign-in is loading.
- The footer no longer overlaps cards on short laptop screens.
- Text typed into Send before the page finished loading is kept.

## 2026-10-03

### Added
- **Merchant Portal one-prompt setup.** Describe the team in words, review it, and save it. Wallets are created for each email, with the pool owner's signature. The split and then the whole team are written to Monad.
- **TipSplitter pool** at `0x06db4c849EF42653982694Ae924dC99DBB80EA35`:
  - `tipIndividual` sends a tip 100% to one person by name;
  - `setTeam` replaces the team in one transaction;
  - `payoutTeam` pays the pool out by the split, evenly within each group, and passes an empty group's share to the others.
- **Employee Dashboard.** Sign in with the email your manager added and see tips arrive live.
- **Customer tipping.** Tip one person or the whole team, from a card that works as a bottom sheet on phones and tablets, with the same keypad on every device.
- **Redesigned site.** New landing page, role chooser, account button and sign-in window.

## 2026-10-02

### Added
- First version: landing page, Privy sign-in, the TipSplitter contract and the Merchant, Employee and Customer screens.
