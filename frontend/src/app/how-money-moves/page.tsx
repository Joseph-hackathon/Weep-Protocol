import type { Metadata } from "next";
import Link from "next/link";
import DocPage, { REPO } from "../DocPage";

export const metadata: Metadata = {
  title: "How money moves · Weep",
  description: "Where your money goes on Weep, what the code guarantees, what the AI does and doesn't do, and the limits of a testnet preview.",
};

const EXPLORER = "https://testnet.monadexplorer.com";
const SRC = `${REPO}/blob/main`;
const PROOF_TX = "0x8be685ec1e20eee98010745c8bbcaf0fa10d1e08967bd1f811f1c9e5594e44e9";

const contents = [
  { id: "never-holds", label: "Weep never holds your money" },
  { id: "send", label: "Sending to several people" },
  { id: "amounts", label: "How amounts are worked out" },
  { id: "guarantees", label: "What the code guarantees" },
  { id: "email", label: "Money sent to an email" },
  { id: "tips", label: "Tips and business pools" },
  { id: "ai", label: "What the AI does, and doesn't" },
  { id: "proof", label: "Check it yourself" },
  { id: "limits", label: "Limits and risks" },
];

export default function Page() {
  return (
    <DocPage
      path="/how-money-moves"
      title="How money moves"
      lead="What happens to your money on Weep, step by step, and what the code guarantees, so you can trust a payment without having to trust us."
      contents={contents}
    >
      <section id="never-holds">
        <h2>Weep never holds your money</h2>
        <p>Every payment goes from your wallet to the people you&apos;re paying, in a transaction you approve. Weep&apos;s website and servers can&apos;t move money from your wallet. Neither can the payment contract, except in a payment you sign. Weep runs on Monad testnet, so the dollars are a test token with no real-world value.</p>
      </section>

      <section id="send">
        <h2>Sending to several people</h2>
        <ol className="doc-steps">
          <li><strong>Describe it.</strong> Write who gets what, in your own words. For example: &ldquo;$60 to Sam, Ama and Kai, Sam gets half&rdquo;. You can also add people yourself.</li>
          <li><strong>Check it.</strong> Weep lists every person with their exact amount, worked out by Weep&apos;s own code. Change anything you like. If something doesn&apos;t add up, Weep says so and won&apos;t send.</li>
          <li><strong>Reach emails.</strong> If you&apos;re paying people by email, your wallet signs once so Weep can find, or create, their wallets.</li>
          <li><strong>Top up test dollars.</strong> If your balance is short, Weep adds test dollars to your wallet first. That&apos;s possible only because this is testnet.</li>
          <li><strong>Allow the exact total.</strong> Your wallet lets the payment contract use exactly the total you reviewed, and not a cent more.</li>
          <li><strong>Send once.</strong> One transaction pays everyone at the same moment.</li>
          <li><strong>Get your receipt.</strong> The receipt is read back from Monad: what actually reached each person, with a link to the transaction.</li>
        </ol>
      </section>

      <section id="amounts">
        <h2>How amounts are worked out</h2>
        <p>Each person&apos;s share is a fixed amount, a percentage, or an equal share. Weep works out the cents the same way every time:</p>
        <ol>
          <li>Fixed amounts come first.</li>
          <li>Percentages of the total come next, rounded down to the cent.</li>
          <li>Whatever&apos;s left is split equally among everyone on an equal share.</li>
          <li>Any leftover cents go one at a time to the first people on the list, and the review shows who got one.</li>
        </ol>
        <p>So $100 split three ways is $33.34, $33.33 and $33.33. The shares always add up to exactly the total. Nothing is rounded away. The rules are in <a href={`${SRC}/frontend/src/app/allocate.ts`} target="_blank" rel="noreferrer">allocate.ts</a>.</p>
      </section>

      <section id="guarantees">
        <h2>What the code guarantees</h2>
        <p>The WeepPay contract enforces these rules on Monad itself, whatever any website sends it:</p>
        <div className="doc-table" role="region" aria-label="Guarantees enforced by WeepPay" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Guarantee</th><th scope="col">How</th></tr></thead>
            <tbody>
              <tr><th scope="row">Everyone is paid, or no one is</th><td data-label="How">If any one transfer fails, the whole payment is undone.</td></tr>
              <tr><th scope="row">The parts must equal the total you reviewed</th><td data-label="How">The contract adds up every amount and refuses the payment if the sum differs from the total you signed.</td></tr>
              <tr><th scope="row">Only your own money moves</th><td data-label="How">It can only spend what your wallet allowed. Weep allows exactly the reviewed total.</td></tr>
              <tr><th scope="row">The contract keeps nothing</th><td data-label="How">Money passes straight from you to each person. The contract never holds a balance.</td></tr>
              <tr><th scope="row">No one controls it</th><td data-label="How">WeepPay has no owner, no admin and no way to pause or withdraw.</td></tr>
              <tr><th scope="row">No empty or broken payments</th><td data-label="How">Zero amounts, missing wallets and more than 100 people are refused.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Read the contract: <a href={`${SRC}/contracts/contracts/WeepPay.sol`} target="_blank" rel="noreferrer">WeepPay.sol</a>. Its tests check each guarantee: <a href={`${SRC}/contracts/test/WeepPay.test.js`} target="_blank" rel="noreferrer">WeepPay.test.js</a>.</p>
      </section>

      <section id="email">
        <h2>Money sent to an email</h2>
        <p>Paying an email pays the wallet that Privy links to it, and Privy creates the wallet if the person doesn&apos;t have one yet. The money is in that wallet as soon as the payment confirms. There&apos;s nothing to claim. The person sees it by signing in to Weep with that email, which only they can do, because it takes a code sent to their inbox. Wallets made by Privy are non-custodial: neither Weep nor Privy can spend from them.</p>
        <p>Weep doesn&apos;t notify the people you pay, so tell them yourself. The same email always leads to the same wallet.</p>
      </section>

      <section id="tips">
        <h2>Tips and business pools</h2>
        <ul>
          <li><strong>Tip a person by name.</strong> The tip goes straight from the guest to that person&apos;s wallet, 100%, through the pool contract&apos;s <code>tipIndividual</code>. It never sits in the pool.</li>
          <li><strong>Tip the whole team.</strong> The tip goes into the business&apos;s pool contract and waits there until the business pays out. The payout splits it between groups (floor, kitchen, bar) by the business&apos;s rule, and evenly within each group. A group with nobody in it passes its share to the others. A remainder smaller than a cent can stay in the pool, and it goes out with the next payout.</li>
          <li><strong>Who controls a pool.</strong> The wallet that owns the pool, plus any agent it names, sets the team, changes the split and starts payouts. Staff are trusting the business to pay out. Every team change and payout is public on Monad, so anyone can check it.</li>
        </ul>
        <p>Read the pool contract: <a href={`${SRC}/contracts/contracts/TipSplitter.sol`} target="_blank" rel="noreferrer">TipSplitter.sol</a>.</p>
      </section>

      <section id="ai">
        <h2>What the AI does, and doesn&apos;t</h2>
        <p>Weep uses Google&apos;s Gemini models to read a description and draft the list of people. It uses the same approach to read a team description in the Merchant Portal.</p>
        <ul>
          <li><strong>It reads.</strong> It finds people, emails, wallets, the total, and whether each share is a fixed amount, a percentage or an equal share.</li>
          <li><strong>It doesn&apos;t calculate.</strong> Weep&apos;s own code works out every cent, as described above.</li>
          <li><strong>It doesn&apos;t send.</strong> Nothing moves until you review the list and approve the payment in your wallet.</li>
          <li><strong>It asks rather than guesses.</strong> If the total is missing, a person is unclear, or the amounts can&apos;t add up, it asks you a question.</li>
          <li><strong>It doesn&apos;t make people up.</strong> If you say &ldquo;20 winners&rdquo; without naming them, it creates numbered rows and asks how to reach each person.</li>
        </ul>
        <p>On 8 October 2026 we tried 14 very different descriptions on the live site. They included a long paragraph with the amounts buried inside, &ldquo;2k&rdquo; and &ldquo;1.5k&rdquo;, &ldquo;fifty bucks&rdquo;, &ldquo;USD 1,250.75&rdquo;, fractions and percentages, emails only, raw wallet addresses, a misspelled name, 20 unnamed winners, a request with no total, and amounts that don&apos;t add up. Sent one at a time, all 14 were read correctly, and the last two produced a question instead of a guess. When all 14 were sent at once, 3 came back with &ldquo;Couldn&apos;t read that just now&rdquo; because the AI service was busy. Weep showed that message rather than a wrong draft. AI can still make mistakes, and that&apos;s why you check every amount before sending.</p>
      </section>

      <section id="proof">
        <h2>Check it yourself</h2>
        <div className="doc-table" role="region" aria-label="Weep contracts on Monad testnet" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Contract</th><th scope="col">Address on Monad testnet (chain 10143)</th></tr></thead>
            <tbody>
              <tr><th scope="row">WeepPay: one payment to many people</th><td data-label="Address on Monad testnet (chain 10143)"><a href={`${EXPLORER}/address/0xa0209c2245FdD5928a7a602a2d4c7d4239CF5A26`} target="_blank" rel="noreferrer"><code>0xa0209c2245FdD5928a7a602a2d4c7d4239CF5A26</code></a></td></tr>
              <tr><th scope="row">TipSplitter: business tip pool</th><td data-label="Address on Monad testnet (chain 10143)"><a href={`${EXPLORER}/address/0x06db4c849EF42653982694Ae924dC99DBB80EA35`} target="_blank" rel="noreferrer"><code>0x06db4c849EF42653982694Ae924dC99DBB80EA35</code></a></td></tr>
              <tr><th scope="row">AUSD (test): the dollars Weep uses</th><td data-label="Address on Monad testnet (chain 10143)"><a href={`${EXPLORER}/address/0xcEF38D455529Dbc2e37654452C288C25e18ADea4`} target="_blank" rel="noreferrer"><code>0xcEF38D455529Dbc2e37654452C288C25e18ADea4</code></a></td></tr>
            </tbody>
          </table>
        </div>
        <p>An example payment: on 8 October 2026, <a href={`${EXPLORER}/tx/${PROOF_TX}`} target="_blank" rel="noreferrer">one WeepPay transaction</a> paid $100.00 to three people, as $33.34, $33.33 and $33.33. Two were paid by email and one by wallet address. The sender was charged exactly $100.00, each person received exactly their share, and the contract kept nothing.</p>
        <p>Every payment in Weep links to its own transaction like this one, so you never need to take our word for it.</p>
      </section>

      <section id="limits">
        <h2>Limits and risks</h2>
        <ul>
          <li><strong>Payments can&apos;t be undone.</strong> Once Monad records a payment, only the person who received it can send it back.</li>
          <li><strong>Testnet only.</strong> Test dollars have no value. The network can be slow, reset or unavailable, and Weep&apos;s contracts may be replaced by new versions.</li>
          <li><strong>Not audited.</strong> The contracts are tested but haven&apos;t been reviewed by an independent auditor.</li>
          <li><strong>Wrong address, wrong person.</strong> Money sent to a mistyped wallet or email goes to that wallet or email.</li>
          <li><strong>Network fees.</strong> Each transaction needs a little MON, which is free on testnet from the <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">Monad faucet</a>.</li>
          <li><strong>Recent activity only in the app.</strong> My money and the Employee Dashboard show payments they see arrive while open, plus what they remember on your device. The full history of any wallet is always on the <a href={EXPLORER} target="_blank" rel="noreferrer">Monad testnet explorer</a>.</li>
          <li><strong>Services can fail.</strong> If Privy, the Gemini API or the Monad endpoint is down, signing in, reading descriptions or sending may not work until it&apos;s back. A payment either confirms in full or doesn&apos;t happen at all.</li>
        </ul>
        <p>See also the <Link href="/terms">Terms of use</Link> and the <Link href="/privacy">Privacy notice</Link>.</p>
      </section>
    </DocPage>
  );
}
