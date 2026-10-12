import type { Metadata } from "next";
import Link from "next/link";
import DocPage, { Part, REPO } from "../DocPage";
import { PAY } from "../pay";
import { WEEP_POOLS } from "../setup-message";

export const metadata: Metadata = {
  title: "How money moves · Weep",
  description: "Where your money goes on Weep, Weep's fee, what the code guarantees, what the AI does, and what to know about a testnet preview.",
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
      lead="What happens to your money on Weep, step by step, and what the code guarantees, so you can check every payment yourself."
      glance={[
        { title: "Your money goes straight to each person.", text: "From your wallet to theirs, in one step." },
        { title: "Exact to the cent.", text: "Code works out every share, and you approve it." },
        { title: "Everyone at once.", text: "One payment pays everyone together, or the whole payment stays with you." },
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
          <li><strong>Allow the exact total.</strong> Your wallet lets the payment contract use exactly the total you reviewed plus the fee, to the cent.</li>
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
        <p>So $100 split three ways is $33.34, $33.33 and $33.33. The shares always add up to exactly the total, every cent accounted for. The rules are in <a href={`${SRC}/frontend/src/app/allocate.ts`} target="_blank" rel="noreferrer">allocate.ts</a>.</p>
      </Part>

      <Part id="fee" title="Weep's fee">
        <p>Weep charges a small fee on the money it moves, and the payer pays it on top. Recipients and staff always receive 100% of the amount.</p>
        <ul>
          <li><strong>0.3% on personal payments</strong> (Send). Paying $100.00 to three people costs you $100.30.</li>
          <li><strong>0.5% on business tips</strong>, named or to the whole team. A $10.00 team tip costs the guest $10.05, and the team receives $10.00.</li>
        </ul>
        <p>The fee is worked out on Monad: the amount times the rate, rounded down. You see it before you sign, and the contract takes exactly the fee you saw. Each rate and its recipient are fixed for good when the contract is deployed, with rates capped at 1%. On testnet the fee is paid in test dollars.</p>
      </Part>

      <Part id="guarantees" title="What the code guarantees">
        <p>The WeepPay contract enforces these rules on Monad itself, whatever any website sends it:</p>
        <div className="doc-table" role="region" aria-label="Guarantees enforced by WeepPay" tabIndex={0}>
          <table>
            <thead><tr><th scope="col">Guarantee</th><th scope="col">How</th></tr></thead>
            <tbody>
              <tr><th scope="row">Everyone is paid together</th><td data-label="How">All transfers land in one step, or the whole payment stays with you.</td></tr>
              <tr><th scope="row">The fee is the one you saw</th><td data-label="How">The contract works out the fee itself and matches it to the fee you reviewed. Its rate is fixed.</td></tr>
              <tr><th scope="row">The parts equal the total you reviewed</th><td data-label="How">The contract adds up every amount and confirms the sum equals the total you signed.</td></tr>
              <tr><th scope="row">Only your own money moves</th><td data-label="How">It can only spend what your wallet allowed. Weep allows exactly the reviewed total.</td></tr>
              <tr><th scope="row">Straight to each person</th><td data-label="How">Money passes directly from you to each person, so the contract&apos;s balance stays at zero.</td></tr>
              <tr><th scope="row">Ownerless</th><td data-label="How">WeepPay runs on its own code alone, open for anyone to read.</td></tr>
              <tr><th scope="row">Every payment is complete</th><td data-label="How">Every person has a wallet and an amount, for up to 100 people.</td></tr>
            </tbody>
          </table>
        </div>
        <p>Read the contract: <a href={`${SRC}/contracts/contracts/WeepPay.sol`} target="_blank" rel="noreferrer">WeepPay.sol</a>. Its tests check each guarantee: <a href={`${SRC}/contracts/test/WeepPay.test.js`} target="_blank" rel="noreferrer">WeepPay.test.js</a>.</p>
      </Part>

      <Part id="email" title="Money sent to an email">
        <p>Paying an email pays the wallet that Privy links to it, and Privy creates the wallet if the person doesn&apos;t have one yet. The money is in that wallet as soon as the payment confirms, ready to use. The person sees it by signing in to Weep with that email, with a code sent to their own inbox. Wallets made by Privy are non-custodial: only the person who owns the wallet can spend from it.</p>
        <p>Weep doesn&apos;t notify the people you pay, so tell them yourself. The same email always leads to the same wallet.</p>
      </Part>

      <Part id="tips" title="Tips and business pools">
        <ul>
          <li><strong>Every business has its own pool.</strong> Setting up a team in the Merchant Portal creates the business&apos;s own pool on Monad in one confirmation, owned by its wallet. Its table code opens exactly that pool, and Weep confirms the code leads to a real Weep pool before anyone sends.</li>
          <li><strong>Tip a person by name.</strong> The tip goes straight from the guest to that person&apos;s wallet, 100%, through the pool&apos;s <code>tipIndividual</code>, with the 0.5% fee on top. It goes directly to them. The tip carries the wallet the guest saw for that name, so it always reaches the person the guest chose.</li>
          <li><strong>Tip the whole team.</strong> The tip goes into the business&apos;s pool through <code>tipTeam</code>, 100%, with the fee on top, and waits there until it&apos;s paid out. The payout splits it between groups (floor, kitchen, bar) by the business&apos;s rule, and evenly within each group. An empty group passes its share to the others. A remainder smaller than a cent can stay in the pool, and it goes out with the next payout.</li>
          <li><strong>Anyone can pay out.</strong> Staff get paid on their own schedule: anyone can pay a pool out, from the table code&apos;s <em>Split details</em>. The money always goes to the saved team, by the saved split.</li>
          <li><strong>Who controls a pool.</strong> Only the wallet that owns the pool can change the team and the split. Weep can&apos;t. Every team change and payout is public on Monad, so anyone can check it.</li>
        </ul>
        <p>Read the contracts: <a href={`${SRC}/contracts/contracts/WeepPools.sol`} target="_blank" rel="noreferrer">WeepPools.sol</a> and <a href={`${SRC}/contracts/contracts/TipPool.sol`} target="_blank" rel="noreferrer">TipPool.sol</a>.</p>
      </Part>

      <Part id="ai" title="What the AI does, and doesn&apos;t">
        <p>Weep uses Google&apos;s Gemini models to read a description and draft the list of people. It uses the same approach to read a team description in the Merchant Portal.</p>
        <p>A team description can also be read through Chainlink&apos;s network. Weep&apos;s <a href="https://github.com/Joseph-hackathon/Weep-Protocol/tree/main/cre" target="_blank" rel="noreferrer">Chainlink CRE workflow</a> asks Gemini, checks the answer by the tip pool&apos;s rules, and records the team&apos;s first names, groups and split on Monad, signed by the Chainlink network. When the review in the Merchant Portal matches that record exactly, the review card says <em>Read by Chainlink CRE</em>. The record is public, and the business saves its team itself.</p>
        <ul>
          <li><strong>It reads.</strong> It finds people, emails, wallets, the total, and whether each share is a fixed amount, a percentage or an equal share.</li>
          <li><strong>It doesn&apos;t calculate.</strong> Weep&apos;s own code works out every cent, as described above.</li>
          <li><strong>You send.</strong> Money moves when you review the list and approve the payment in your wallet.</li>
          <li><strong>It asks rather than guesses.</strong> If the total is missing, a person is unclear, or the amounts can&apos;t add up, it asks you a question.</li>
          <li><strong>It asks when it needs to.</strong> If you say &ldquo;20 winners&rdquo;, it creates numbered rows and asks how to reach each person.</li>
        </ul>
        <p>On 9 October 2026 we tried 14 very different descriptions on the live site. They included a long paragraph with the amounts buried inside, &ldquo;2k&rdquo; and &ldquo;1.5k&rdquo;, &ldquo;fifty bucks&rdquo;, &ldquo;USD 1,250.75&rdquo;, fractions and percentages, emails only, raw wallet addresses, a misspelled name, 20 unnamed winners, a request missing its total, and amounts that needed checking. Sent one at a time, all 14 were read correctly. For the last two it asked a question instead of guessing. Sent all at once, all 14 were answered. Each answer took between 4 and 30 seconds. You review every amount before sending, so you always have the final say.</p>
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
          <p>An example payment: <a href={`${EXPLORER}/tx/${PROOF_TX}`} target="_blank" rel="noreferrer">one WeepPay transaction</a> paid $100.00 to three people, as $33.34, $33.33 and $33.33, and the sender paid the $0.30 fee on top. Each person received exactly their share.</p>
        )}
        <p>Every payment in Weep links to its own transaction, so you can check it yourself.</p>
      </Part>

      <Part id="limits" title="Good to know">
        <ul>
          <li><strong>Payments are final.</strong> Once Monad records a payment, it belongs to the person who received it, who can send it back if needed.</li>
          <li><strong>Testnet preview.</strong> Weep runs on Monad testnet with test dollars, and its contracts may move to new versions as it grows.</li>
          <li><strong>Independent audit next.</strong> The contracts are fully tested, and an independent audit comes before mainnet.</li>
          <li><strong>Check each address.</strong> Money goes to exactly the wallet or email you enter, so the review shows every one.</li>
          <li><strong>Network fees.</strong> Each transaction needs a little MON. Weep covers the first fees of a new account made with email or a passkey; a wallet you connect yourself gets MON free from the <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">Monad faucet</a>.</li>
          <li><strong>Recent activity in the app.</strong> My money and the Employee Dashboard show payments as they arrive, plus what they remember on your device. The full history of any wallet is always on the <a href={EXPLORER} target="_blank" rel="noreferrer">Monad testnet explorer</a>.</li>
          <li><strong>Built on trusted services.</strong> Signing in uses Privy, reading descriptions uses the Gemini API, and payments use Monad. Every payment confirms in full, in one step.</li>
        </ul>
        <p>See also the <Link href="/terms">Terms of use</Link> and the <Link href="/privacy">Privacy notice</Link>.</p>
      </Part>
    </DocPage>
  );
}
