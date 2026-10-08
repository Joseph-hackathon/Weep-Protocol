# Changelog

User-visible changes to Weep, newest first. Everything below was built during Monad Metropolis (1 September – 13 October 2026).

## 2026-10-08

### Added
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
