import type { Metadata } from "next";
import Link from "next/link";
import DocPage, { Part, REPO } from "../DocPage";
import { PAY } from "../pay";
import { WEEP_POOLS } from "../setup-message";

export const metadata: Metadata = {
  title: "How money moves · Weep",
  description: "Where your money goes on Weep, Weep's fee, what the code guarantees, what the AI does and doesn't do, and the limits of a testnet preview.",
};

const EXPLORER = "https://testnet.monadexplorer.com";
const SRC = `${REPO}/blob/main`;
// Our own run on the current contracts: a $100.00 payment to three people, plus the $0.30 fee. Shown once filled in.
const PROOF_TX = "0x6f4558cbc4837385f5d5b198cdf2059d571d223fb382d014ab9159786b71b3c0";
const isHash = (h: string) => /^0x[0-9a-fA-F]{64}$/.test(h);


export default function Page() {
  return (
    <DocPage
      path="/how-money-moves"
      title="How money moves"
      lead="What happens to your money on Weep, step by step, and what the code guarantees, so you can trust a payment without having to trust us."
      glance={[
        { title: "Weep never holds your money.", text: "It goes from your wallet straight to each person." },
        { title: "Exact to the cent.", text: "Code works out every share, and you approve it." },
        { title: "Everyone, or no one.", text: "One payment pays everyone at once, or nobody at all." },
        { title: "A small fee, on top.", text: "0.3% on payments, 0.5% on tips, paid by the payer. Everyone receives 100%." },
      ]}
    >
      <Part id="send" title="Sending to several people">
        <ol className="doc-steps">
          <li><strong>Describe it.</strong> Write who gets what, in your own words. For example: &ldquo;$60 to Sam, Ama and Kai, Sam gets half&rdquo;. You can also add people yourself.</li>
          <li><strong>Check it.</strong> Weep lists every person with their exact amount, worked out by Weep&apos;s own code. Change anything you like. If something doesn&apos;t add up, Weep says so and won&apos;t send.</li>
          <li><strong>Reach emails.</strong> If you&apos;re paying people by email, your wallet signs once so Weep can find, or create, their wallets.</li>
          <li><strong>Cover the fee.</strong> If you signed in with email and your wallet is low on MON, Weep sends it a little test MON for the network fee first.</li>
          <li><strong>Top up test dollars.</strong> If your balance is short, Weep adds test dollars to your wallet first. That&apos;s possible only because this is testnet.</li>
          <li><strong>See the fee.</strong> Weep&apos;s 0.3% fee is shown before you sign, on top of the total: everyone still gets their full amount.</li>
          <li><strong>Allow the exact total.</strong> Your wallet lets the payment contract use exactly the total you reviewed plus the fee, and not a cent more.</li>
          <li><strong>Send once.</strong> One transaction pays everyone at the same moment.</li>
          <li><strong>Get your receipt.</strong> The receipt is read back from Monad: what actually reached each person and the fee paid, with a link to the transaction.</li>
        </ol>
      </Part>

      <Part id="amounts" title="How amounts are worked out">
        <p>Each person&apos;s share is a fixed amount, a percentage, or an equal share. Weep works out the cents the same way every time:</p>
        <ol>
          <li>Fixed amounts come first.</li>
          <li>Percentages of the total come next, rounded down to the cent.</li>
          <li>Whatever&apos;s left is split equally among everyone on an equal share.</li>
          <li>Any leftover cents go one at a time to the first people on the list, and the review shows who got one.</li>
        </ol>
        <p>So $100 split three ways is $33.34, $33.33 and $33.33. The shares always add up to exactly the total. Nothing is rounded away. The rules are in <a href={`${SRC}/frontend/src/app/allocate.ts`} target="_blank" rel="noreferrer">allocate.ts</a>.</p>
      </Part>

      <Part id="fee" title="Weep's fee">
        <p>Weep charges a small fee on the money it moves, and the payer pays it on top. Recipients and staff always receive 100% of the amount.</p>
        <ul>
          <li><strong>0.3% on personal payments</strong> (Send). Paying $100.00 to three people costs you $100.30.</li>
          <li><strong>0.5% on business tips</strong>, named or to the whole team. A $10.00 team tip costs the guest $10.05, and the team receives $10.00.</li>
        </ul>
        <p>The fee is worked out on Monad: the amount times the rate, rounded down, never up. You see it before you sign, and the contract refuses the payment if the fee isn&apos;t the one you saw. Each rate and its recipient are fixed when the contract is deployed: no one, including Weep, can change them afterwards, and the contracts refuse any rate above 1%. On testnet the fee is paid in test dollars and has no real value.</p>
      </Part>

      <Part id="guarantees" title="What the code guarantees">
        <p>The WeepPay contract enforces these rules on Monad itself, whatever any website sends it:</p>
        <div className="doc-table" role="region" aria-label="Guarantees enforced by WeepPay" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Guarantee</th><th scope="col">How</th></tr></thead>
            <tbody>
              <tr><th scope="row">Everyone is paid, or no one is</th><td data-label="How">If any one transfer fails, the whole payment is undone.</td></tr>
              <tr><th scope="row">The fee is the one you saw</th><td data-label="How">The contract works out the fee itself and refuses the payment if it differs from the fee you reviewed. Its rate can&apos;t change.</td></tr>
              <tr><th scope="row">The parts must equal the total you reviewed</th><td data-label="How">The contract adds up every amount and refuses the payment if the sum differs from the total you signed.</td></tr>
              <tr><th scope="row">Only your own money moves</th><td data-label="How">It can only spend what your wallet allowed. Weep allows exactly the reviewed total.</td></tr>
              <tr><th scope="row">The contract keeps nothing</th><td data-label="How">Money passes straight from you to each person. The contract never holds a balance.</td></tr>
              <tr><th scope="row">No one controls it</th><td data-label="How">WeepPay has no owner, no admin and no way to pause or withdraw.</td></tr>
              <tr><th scope="row">No empty or broken payments</th><td data-label="How">Zero amounts, missing wallets and more than 100 people are refused.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Read the contract: <a href={`${SRC}/contracts/contracts/WeepPay.sol`} target="_blank" rel="noreferrer">WeepPay.sol</a>. Its tests check each guarantee: <a href={`${SRC}/contracts/test/WeepPay.test.js`} target="_blank" rel="noreferrer">WeepPay.test.js</a>.</p>
      </Part>

      <Part id="email" title="Money sent to an email">
        <p>Paying an email pays the wallet that Privy links to it, and Privy creates the wallet if the person doesn&apos;t have one yet. The money is in that wallet as soon as the payment confirms. There&apos;s nothing to claim. The person sees it by signing in to Weep with that email, which only they can do, because it takes a code sent to their inbox. Wallets made by Privy are non-custodial: neither Weep nor Privy can spend from them.</p>
        <p>Weep doesn&apos;t notify the people you pay, so tell them yourself. The same email always leads to the same wallet.</p>
      </Part>

      <Part id="tips" title="Tips and business pools">
        <ul>
          <li><strong>Every business has its own pool.</strong> Setting up a team in the Merchant Portal creates the business&apos;s own pool on Monad in one confirmation, owned by its wallet. Its table code opens that pool and no other, and Weep checks the code leads to a real Weep pool before anyone can send.</li>
          <li><strong>Tip a person by name.</strong> The tip goes straight from the guest to that person&apos;s wallet, 100%, through the pool&apos;s <code>tipIndividual</code>, with the 0.5% fee on top. It never sits in the pool. The tip carries the wallet the guest saw for that name; if the business changed it since, nothing moves.</li>
          <li><strong>Tip the whole team.</strong> The tip goes into the business&apos;s pool through <code>tipTeam</code>, 100%, with the fee on top, and waits there until it&apos;s paid out. The payout splits it between groups (floor, kitchen, bar) by the business&apos;s rule, and evenly within each group. A group with nobody in it passes its share to the others. A remainder smaller than a cent can stay in the pool, and it goes out with the next payout.</li>
          <li><strong>Anyone can pay out.</strong> Staff don&apos;t have to wait for the owner: anyone can pay a pool out, from the table code&apos;s <em>Split details</em>. The money can only go to the saved team, by the saved split, so whoever presses the button gets nothing.</li>
          <li><strong>Who controls a pool.</strong> Only the wallet that owns the pool can change the team and the split. Weep can&apos;t. Every team change and payout is public on Monad, so anyone can check it.</li>
        </ul>
        <p>Read the contracts: <a href={`${SRC}/contracts/contracts/WeepPools.sol`} target="_blank" rel="noreferrer">WeepPools.sol</a> and <a href={`${SRC}/contracts/contracts/TipPool.sol`} target="_blank" rel="noreferrer">TipPool.sol</a>.</p>
      </Part>

      <Part id="ai" title="What the AI does, and doesn&apos;t">
        <p>Weep uses Google&apos;s Gemini models to read a description and draft the list of people. It uses the same approach to read a team description in the Merchant Portal.</p>
        <p>A team description can also be read through Chainlink&apos;s network. Weep&apos;s <a href="https://github.com/Joseph-hackathon/Weep-Protocol/tree/main/cre" target="_blank" rel="noreferrer">Chainlink CRE workflow</a> asks Gemini, checks the answer by the tip pool&apos;s rules, and records the team&apos;s first names, groups and split on Monad, signed by the Chainlink network. When the review in the Merchant Portal matches that record exactly, the review card says <em>Read by Chainlink CRE</em>. The record has no power over any pool. The business still saves its team itself.</p>
        <ul>
          <li><strong>It reads.</strong> It finds people, emails, wallets, the total, and whether each share is a fixed amount, a percentage or an equal share.</li>
          <li><strong>It doesn&apos;t calculate.</strong> Weep&apos;s own code works out every cent, as described above.</li>
          <li><strong>It doesn&apos;t send.</strong> Nothing moves until you review the list and approve the payment in your wallet.</li>
          <li><strong>It asks rather than guesses.</strong> If the total is missing, a person is unclear, or the amounts can&apos;t add up, it asks you a question.</li>
          <li><strong>It doesn&apos;t make people up.</strong> If you say &ldquo;20 winners&rdquo; without naming them, it creates numbered rows and asks how to reach each person.</li>
        </ul>
        <p>On 9 October 2026 we tried 14 very different descriptions on the live site. They included a long paragraph with the amounts buried inside, &ldquo;2k&rdquo; and &ldquo;1.5k&rdquo;, &ldquo;fifty bucks&rdquo;, &ldquo;USD 1,250.75&rdquo;, fractions and percentages, emails only, raw wallet addresses, a misspelled name, 20 unnamed winners, a request with no total, and amounts that don&apos;t add up. Sent one at a time, all 14 were read correctly. For the last two it asked a question instead of guessing. Sent all at once, all 14 were answered. Each answer took between 4 and 30 seconds. AI can still make mistakes, and that&apos;s why you check every amount before sending.</p>
      </Part>

      <Part id="proof" title="Check it yourself">
        <div className="doc-table" role="region" aria-label="Weep contracts on Monad testnet" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Contract</th><th scope="col">Address on Monad testnet (chain 10143)</th></tr></thead>
            <tbody>
              <tr><th scope="row">WeepPay: one payment to many people</th><td data-label="Address on Monad testnet (chain 10143)"><a href={`${EXPLORER}/address/${PAY}`} target="_blank" rel="noreferrer"><code>{PAY}</code></a></td></tr>
              <tr><th scope="row">WeepPools: a tip pool for every business</th><td data-label="Address on Monad testnet (chain 10143)"><a href={`${EXPLORER}/address/${WEEP_POOLS}`} target="_blank" rel="noreferrer"><code>{WEEP_POOLS}</code></a></td></tr>
              <tr><th scope="row">AUSD (test): the dollars Weep uses</th><td data-label="Address on Monad testnet (chain 10143)"><a href={`${EXPLORER}/address/0xcEF38D455529Dbc2e37654452C288C25e18ADea4`} target="_blank" rel="noreferrer"><code>0xcEF38D455529Dbc2e37654452C288C25e18ADea4</code></a></td></tr>
            </tbody>
          </table>
        </div>
        {isHash(PROOF_TX) && (
          <p>An example payment: <a href={`${EXPLORER}/tx/${PROOF_TX}`} target="_blank" rel="noreferrer">one WeepPay transaction</a> paid $100.00 to three people, as $33.34, $33.33 and $33.33, and the sender paid the $0.30 fee on top. Each person received exactly their share, and the contract kept nothing.</p>
        )}
        <p>Every payment in Weep links to its own transaction, so you never need to take our word for it.</p>
      </Part>

      <Part id="limits" title="Limits and risks">
        <ul>
          <li><strong>Payments can&apos;t be undone.</strong> Once Monad records a payment, only the person who received it can send it back.</li>
          <li><strong>Testnet only.</strong> Test dollars, and the fees paid in them, have no value. The network can be slow, reset or unavailable, and Weep&apos;s contracts may be replaced by new versions.</li>
          <li><strong>Not audited.</strong> The contracts are tested but haven&apos;t been reviewed by an independent auditor.</li>
          <li><strong>Wrong address, wrong person.</strong> Money sent to a mistyped wallet or email goes to that wallet or email.</li>
          <li><strong>Network fees.</strong> Each transaction needs a little MON. Weep covers the first fees of email sign-ins; a wallet you connect yourself gets MON free from the <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">Monad faucet</a>.</li>
          <li><strong>Recent activity only in the app.</strong> My money and the Employee Dashboard show payments they see arrive while open, plus what they remember on your device. The full history of any wallet is always on the <a href={EXPLORER} target="_blank" rel="noreferrer">Monad testnet explorer</a>.</li>
          <li><strong>Services can fail.</strong> If Privy, the Gemini API or the Monad endpoint is down, signing in, reading descriptions or sending may not work until it&apos;s back. A payment either confirms in full or doesn&apos;t happen at all.</li>
        </ul>
        <p>See also the <Link href="/terms">Terms of use</Link> and the <Link href="/privacy">Privacy notice</Link>.</p>
      </Part>
    </DocPage>
  );
}
