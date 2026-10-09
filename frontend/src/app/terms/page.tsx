import type { Metadata } from "next";
import Link from "next/link";
import { X_URL } from "../SiteFooter";
import DocPage, { Part, CONTACT, REPO } from "../DocPage";

export const metadata: Metadata = {
  title: "Terms of use · Weep",
  description: "The rules for using Weep: a testnet preview where test dollars have no value and payments can't be reversed.",
};


export default function Page() {
  return (
    <DocPage
      path="/terms"
      title="Terms of use"
      lead="Weep lets you pay several people in one go, receive money, and tip, on the Monad test network. These terms are the rules for using it. Please read them with the Privacy notice and How money moves."
      glance={[
        { title: "Test dollars only.", text: "Weep runs on Monad testnet. Its dollars have no real-world value." },
        { title: "Your money stays yours.", text: "Payments go from your wallet straight to the people you pay. Weep never holds them." },
        { title: "Payments are final.", text: "Once Monad records a payment, no one can reverse it. Check the review first." },
        { title: "You approve every amount.", text: "The AI only drafts the list. Nothing is sent until you approve it." },
      ]}
    >

      <Part id="about" title="About Weep and these terms">
        <p>Weep is provided by the team that maintains the open-source <a href={REPO} target="_blank" rel="noreferrer">Weep Protocol project</a> (&ldquo;Weep&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). These terms cover the website at weep-protocol.vercel.app and the Weep smart contracts it uses, together called the service.</p>
        <p>By using the service you agree to these terms. If you don&apos;t agree, please don&apos;t use it.</p>
      </Part>

      <Part id="preview" title="A testnet preview">
        <p>Weep is a working preview built for the Monad Metropolis hackathon. It runs only on Monad testnet (chain ID 10143), a public network for testing.</p>
        <ul>
          <li>The dollars in Weep are a test token. Anyone can create more of them, and they can&apos;t be exchanged for real money.</li>
          <li>Weep is not a bank, a payment service or an exchange. It doesn&apos;t hold deposits, convert currencies or move real money.</li>
          <li>The smart contracts haven&apos;t been independently audited.</li>
        </ul>
        <p>Don&apos;t send real assets to any Weep address, and don&apos;t rely on Weep for anything that needs real money.</p>
      </Part>

      <Part id="eligibility" title="Who can use Weep">
        <p>You must be at least 18 and able to agree to these terms where you live. If you use Weep for a business, you confirm you&apos;re allowed to act for it, and these terms apply to the business too.</p>
      </Part>

      <Part id="account" title="Your sign-in and wallet">
        <p>You can sign in with your email, which gives you a wallet made for you by our sign-in provider, Privy, or with a wallet you already use.</p>
        <ul>
          <li>Your wallet is non-custodial: only you can approve payments from it. Weep never sees or stores your keys.</li>
          <li>Keep access to your email and your wallet safe. Anyone who controls them can use your wallet.</li>
          <li>Because Weep doesn&apos;t hold your keys, we can&apos;t recover a wallet you lose access to, or undo anything done with it.</li>
        </ul>
        <p>If you think someone else has used your account, stop using it and <a href={CONTACT} target="_blank" rel="noreferrer">tell us</a>.</p>
      </Part>

      <Part id="service" title="What Weep does">
        <p>Weep has two sides, and you choose where to go.</p>
        <ul>
          <li><strong>Individual.</strong> <em>Send</em> pays several people in one payment from a description you write. <em>My money</em> shows what you&apos;ve received and gives you a link and code for getting paid. <em>Tip</em> opens a tip code or link.</li>
          <li><strong>Business.</strong> The <em>Merchant Portal</em> sets up a team and how team tips are split. The <em>Employee Dashboard</em> shows each person their tips. <em>Customer</em> lets guests tip one person or the whole team.</li>
        </ul>
        <p>Exactly how payments work, and what the code guarantees, is set out in <Link href="/how-money-moves">How money moves</Link>.</p>
      </Part>

      <Part id="payments" title="Payments are final">
        <p>Before anything is sent, Weep shows every person and their exact amount. Sending happens only when you approve it in your wallet. Once Monad records a payment:</p>
        <ul>
          <li>it can&apos;t be cancelled, reversed or refunded by Weep;</li>
          <li>if you paid the wrong person or amount, only the person who received it can send it back;</li>
          <li>details of the payment are public on Monad for good.</li>
        </ul>
        <p>You&apos;re responsible for checking the people, wallets, emails and amounts before you send.</p>
      </Part>

      <Part id="ai" title="Drafts written by AI">
        <p>When you describe a payment in words, or describe your team in the Merchant Portal, an AI model reads it and drafts a list for you to check. The AI can misunderstand. It never sends anything, and Weep&apos;s own code, not the AI, works out the amounts. You decide what to send.</p>
      </Part>

      <Part id="email" title="Paying people by email">
        <p>When you pay someone by email, Weep asks Privy for the wallet linked to that email, and Privy creates one if they don&apos;t have one yet. The person gets the money by signing in to Weep with that email. Weep doesn&apos;t email them about it, so let them know yourself.</p>
        <p>Only enter emails of people you know and who&apos;d expect a payment from you. You confirm you have the right to use those addresses for this purpose.</p>
      </Part>

      <Part id="business" title="Business pools">
        <p>Every business that sets up a team gets its own tip pool on Monad, owned by the wallet that created it. Team tips are held by that pool until it&apos;s paid out. Only the owner decides who&apos;s on the team and how tips are split. Anyone can trigger a payout, but it can only pay the saved team by the saved split. Weep can&apos;t change, pause or empty a business&apos;s pool. If you run a pool, you&apos;re responsible for:</p>
        <ul>
          <li>setting it up correctly and paying out promptly;</li>
          <li>following the tipping, employment and tax rules that apply to your business;</li>
          <li>telling your staff how tips are shared, and that the first names you add are stored publicly on Monad.</li>
        </ul>
        <p>Tips sent to one named person go straight to that person and never pass through the pool.</p>
      </Part>

      <Part id="use" title="Acceptable use">
        <p>Don&apos;t use Weep to:</p>
        <ul>
          <li>break any law, or help someone else break one, including sanctions and fraud rules;</li>
          <li>look up or create wallets for emails in bulk, or for people who haven&apos;t agreed;</li>
          <li>harass, scam or impersonate anyone;</li>
          <li>overload, probe or attack the website, its servers, the contracts or the services they use, or get around their limits;</li>
          <li>collect other people&apos;s data from Weep.</li>
        </ul>
        <p>If you find a security problem, please report it privately as described in our <a href={`${REPO}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">security policy</a>.</p>
      </Part>

      <Part id="fees" title="Fees">
        <p>Weep charges a fee on the money it moves: 0.3% on personal payments (Send) and 0.5% on tips to a business&apos;s team or to someone on it. The payer pays the fee on top, so recipients receive the full amount. The fee is shown before you approve anything, is worked out by the contract (rounded down), and can&apos;t be changed after the contract is deployed. On testnet it&apos;s paid in test dollars, with no real value.</p>
        <p>The Monad network also charges a small fee in MON for each transaction. If you signed in with email, Weep may cover your first network fees by sending a little test MON to your wallet; this is a courtesy that can stop at any time. Otherwise, MON is free on testnet from the <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">Monad faucet</a>.</p>
      </Part>

      <Part id="third-parties" title="Services Weep relies on">
        <p>Weep works with services run by other companies, each under its own terms:</p>
        <ul>
          <li>Privy, for sign-in and wallets;</li>
          <li>Google&apos;s Gemini API, for reading descriptions;</li>
          <li>the Monad network and its public endpoints, for payments;</li>
          <li>Vercel, for hosting;</li>
          <li>your own wallet app, if you connect one.</li>
        </ul>
        <p>We aren&apos;t responsible for how these services act or fail. If one is down, parts of Weep may not work. Payments already recorded on Monad aren&apos;t affected.</p>
      </Part>

      <Part id="code" title="Open-source code">
        <p>Weep&apos;s code is open source under the MIT License in our repository. That license covers your use of the code. These terms cover your use of the hosted service. The Weep name and logo aren&apos;t licensed for other projects.</p>
      </Part>

      <Part id="changes" title="Changes, pauses and resets">
        <p>Weep is a preview, so it can change. We may add, change or remove features, pause the website, or move to new contracts at any time, sometimes without notice. Test networks can also be reset by their operators. Records on Monad stay as they are, and new versions of the service may not show older activity.</p>
      </Part>

      <Part id="ending" title="Stopping and suspension">
        <p>You can stop using Weep at any time. We may block access to the website for anyone who breaks these terms or puts others at risk. Blocking access doesn&apos;t touch your wallet: whatever it holds stays yours on Monad, and you can reach it with any compatible wallet.</p>
      </Part>

      <Part id="warranty" title="No warranty">
        <p>To the extent the law allows, Weep is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without promises that it will be uninterrupted, error-free or fit for a particular purpose.</p>
      </Part>

      <Part id="liability" title="Liability">
        <p>To the extent the law allows, we aren&apos;t liable for indirect or consequential losses, or for losses caused by payments you approved, by your wallet or email being used by someone else, by mistakes in AI drafts you approved, or by the services Weep relies on. Weep uses test tokens with no value, so nothing in these terms involves real money.</p>
      </Part>

      <Part id="law" title="Your rights under local law">
        <p>Nothing in these terms takes away rights you have under the law where you live that can&apos;t be waived by agreement.</p>
      </Part>

      <Part id="updates" title="Updates to these terms">
        <p>When we change these terms, we&apos;ll update this page and the date at the top. Earlier versions stay in the repository&apos;s history. If you keep using Weep after a change, the new terms apply.</p>
      </Part>

      <Part id="contact" title="Contact">
        <p>Questions about these terms: <a href={CONTACT} target="_blank" rel="noreferrer">open an issue in the Weep repository</a>, or message <a href={X_URL} target="_blank" rel="noreferrer">@WeepProtocol on X</a>. Please don&apos;t post personal details in public.</p>
      </Part>
    </DocPage>
  );
}
