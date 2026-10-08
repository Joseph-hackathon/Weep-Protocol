import type { Metadata } from "next";
import Link from "next/link";
import DocPage, { CONTACT, REPO } from "../DocPage";

export const metadata: Metadata = {
  title: "Terms of use · Weep",
  description: "The rules for using Weep: a testnet preview where test dollars have no value and payments can't be reversed.",
};

const contents = [
  { id: "about", label: "About Weep and these terms" },
  { id: "preview", label: "A testnet preview" },
  { id: "eligibility", label: "Who can use Weep" },
  { id: "account", label: "Your sign-in and wallet" },
  { id: "service", label: "What Weep does" },
  { id: "payments", label: "Payments are final" },
  { id: "ai", label: "Drafts written by AI" },
  { id: "email", label: "Paying people by email" },
  { id: "business", label: "Business pools" },
  { id: "use", label: "Acceptable use" },
  { id: "fees", label: "Fees" },
  { id: "third-parties", label: "Services Weep relies on" },
  { id: "code", label: "Open-source code" },
  { id: "changes", label: "Changes, pauses and resets" },
  { id: "ending", label: "Stopping and suspension" },
  { id: "warranty", label: "No warranty" },
  { id: "liability", label: "Liability" },
  { id: "law", label: "Your rights under local law" },
  { id: "updates", label: "Updates to these terms" },
  { id: "contact", label: "Contact" },
];

export default function Page() {
  return (
    <DocPage
      path="/terms"
      title="Terms of use"
      lead="Weep lets you pay several people in one go, receive money, and tip, on the Monad test network. These terms are the rules for using it. Please read them with the Privacy notice and How money moves."
      glance={[
        <>Weep runs on Monad <strong>testnet</strong>. Its dollars are test tokens with <strong>no real-world value</strong>.</>,
        <>Weep never holds your money. Payments go from your wallet straight to the people you pay.</>,
        <>A payment sent on Monad <strong>can&apos;t be reversed</strong> by you, by Weep, or by anyone else. Check the review screen before you send.</>,
        <>The AI only drafts the list of people and shares. You approve every amount yourself.</>,
        <>Don&apos;t use Weep to break the law, spam people&apos;s emails, or attack the service.</>,
      ]}
      contents={contents}
    >

      <section id="about">
        <h2>About Weep and these terms</h2>
        <p>Weep is provided by the team that maintains the open-source <a href={REPO} target="_blank" rel="noreferrer">Weep Protocol project</a> (&ldquo;Weep&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;). These terms cover the website at weep-protocol.vercel.app and the Weep smart contracts it uses, together called the service.</p>
        <p>By using the service you agree to these terms. If you don&apos;t agree, please don&apos;t use it.</p>
      </section>

      <section id="preview">
        <h2>A testnet preview</h2>
        <p>Weep is a working preview built for the Monad Metropolis hackathon. It runs only on Monad testnet (chain ID 10143), a public network for testing.</p>
        <ul>
          <li>The dollars in Weep are a test token. Anyone can create more of them, and they can&apos;t be exchanged for real money.</li>
          <li>Weep is not a bank, a payment service or an exchange. It doesn&apos;t hold deposits, convert currencies or move real money.</li>
          <li>The smart contracts haven&apos;t been independently audited.</li>
        </ul>
        <p>Don&apos;t send real assets to any Weep address, and don&apos;t rely on Weep for anything that needs real money.</p>
      </section>

      <section id="eligibility">
        <h2>Who can use Weep</h2>
        <p>You must be at least 18 and able to agree to these terms where you live. If you use Weep for a business, you confirm you&apos;re allowed to act for it, and these terms apply to the business too.</p>
      </section>

      <section id="account">
        <h2>Your sign-in and wallet</h2>
        <p>You can sign in with your email, which gives you a wallet made for you by our sign-in provider, Privy, or with a wallet you already use.</p>
        <ul>
          <li>Your wallet is non-custodial: only you can approve payments from it. Weep never sees or stores your keys.</li>
          <li>Keep access to your email and your wallet safe. Anyone who controls them can use your wallet.</li>
          <li>Because Weep doesn&apos;t hold your keys, we can&apos;t recover a wallet you lose access to, or undo anything done with it.</li>
        </ul>
        <p>If you think someone else has used your account, stop using it and <a href={CONTACT} target="_blank" rel="noreferrer">tell us</a>.</p>
      </section>

      <section id="service">
        <h2>What Weep does</h2>
        <p>Weep has two sides, and you choose where to go.</p>
        <ul>
          <li><strong>Individual.</strong> <em>Send</em> pays several people in one payment from a description you write. <em>My money</em> shows what you&apos;ve received and gives you a link and code for getting paid. <em>Tip</em> opens a tip code or link.</li>
          <li><strong>Business.</strong> The <em>Merchant Portal</em> sets up a team and how team tips are split. The <em>Employee Dashboard</em> shows each person their tips. <em>Customer</em> lets guests tip one person or the whole team.</li>
        </ul>
        <p>Exactly how payments work, and what the code guarantees, is set out in <Link href="/how-money-moves">How money moves</Link>.</p>
      </section>

      <section id="payments">
        <h2>Payments are final</h2>
        <p>Before anything is sent, Weep shows every person and their exact amount. Sending happens only when you approve it in your wallet. Once Monad records a payment:</p>
        <ul>
          <li>it can&apos;t be cancelled, reversed or refunded by Weep;</li>
          <li>if you paid the wrong person or amount, only the person who received it can send it back;</li>
          <li>details of the payment are public on Monad for good.</li>
        </ul>
        <p>You&apos;re responsible for checking the people, wallets, emails and amounts before you send.</p>
      </section>

      <section id="ai">
        <h2>Drafts written by AI</h2>
        <p>When you describe a payment in words, or describe your team in the Merchant Portal, an AI model reads it and drafts a list for you to check. The AI can misunderstand. It never sends anything, and Weep&apos;s own code, not the AI, works out the amounts. You decide what to send.</p>
      </section>

      <section id="email">
        <h2>Paying people by email</h2>
        <p>When you pay someone by email, Weep asks Privy for the wallet linked to that email, and Privy creates one if they don&apos;t have one yet. The person gets the money by signing in to Weep with that email. Weep doesn&apos;t email them about it, so let them know yourself.</p>
        <p>Only enter emails of people you know and who&apos;d expect a payment from you. You confirm you have the right to use those addresses for this purpose.</p>
      </section>

      <section id="business">
        <h2>Business pools</h2>
        <p>A business&apos;s team tips are held by its pool contract until the business pays them out. The wallet that owns the pool, plus any agent it names, decides who&apos;s on the team, how tips are split and when they&apos;re paid out. If you run a pool, you&apos;re responsible for:</p>
        <ul>
          <li>setting it up correctly and paying out promptly;</li>
          <li>following the tipping, employment and tax rules that apply to your business;</li>
          <li>telling your staff how tips are shared, and that the first names you add are stored publicly on Monad.</li>
        </ul>
        <p>Tips sent to one named person go straight to that person and never pass through the pool.</p>
      </section>

      <section id="use">
        <h2>Acceptable use</h2>
        <p>Don&apos;t use Weep to:</p>
        <ul>
          <li>break any law, or help someone else break one, including sanctions and fraud rules;</li>
          <li>look up or create wallets for emails in bulk, or for people who haven&apos;t agreed;</li>
          <li>harass, scam or impersonate anyone;</li>
          <li>overload, probe or attack the website, its servers, the contracts or the services they use, or get around their limits;</li>
          <li>collect other people&apos;s data from Weep.</li>
        </ul>
        <p>If you find a security problem, please report it privately as described in our <a href={`${REPO}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">security policy</a>.</p>
      </section>

      <section id="fees">
        <h2>Fees</h2>
        <p>Weep charges no fees. The Monad network charges a small fee in MON for each transaction, paid from your wallet. On testnet, MON is free from the <a href="https://faucet.monad.xyz" target="_blank" rel="noreferrer">Monad faucet</a>.</p>
      </section>

      <section id="third-parties">
        <h2>Services Weep relies on</h2>
        <p>Weep works with services run by other companies, each under its own terms:</p>
        <ul>
          <li>Privy, for sign-in and wallets;</li>
          <li>Google&apos;s Gemini API, for reading descriptions;</li>
          <li>the Monad network and its public endpoints, for payments;</li>
          <li>Vercel, for hosting;</li>
          <li>your own wallet app, if you connect one.</li>
        </ul>
        <p>We aren&apos;t responsible for how these services act or fail. If one is down, parts of Weep may not work. Payments already recorded on Monad aren&apos;t affected.</p>
      </section>

      <section id="code">
        <h2>Open-source code</h2>
        <p>Weep&apos;s code is open source under the MIT License in our repository. That license covers your use of the code. These terms cover your use of the hosted service. The Weep name and logo aren&apos;t licensed for other projects.</p>
      </section>

      <section id="changes">
        <h2>Changes, pauses and resets</h2>
        <p>Weep is a preview, so it can change. We may add, change or remove features, pause the website, or move to new contracts at any time, sometimes without notice. Test networks can also be reset by their operators. Records on Monad stay as they are, and new versions of the service may not show older activity.</p>
      </section>

      <section id="ending">
        <h2>Stopping and suspension</h2>
        <p>You can stop using Weep at any time. We may block access to the website for anyone who breaks these terms or puts others at risk. Blocking access doesn&apos;t touch your wallet: whatever it holds stays yours on Monad, and you can reach it with any compatible wallet.</p>
      </section>

      <section id="warranty">
        <h2>No warranty</h2>
        <p>To the extent the law allows, Weep is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without promises that it will be uninterrupted, error-free or fit for a particular purpose.</p>
      </section>

      <section id="liability">
        <h2>Liability</h2>
        <p>To the extent the law allows, we aren&apos;t liable for indirect or consequential losses, or for losses caused by payments you approved, by your wallet or email being used by someone else, by mistakes in AI drafts you approved, or by the services Weep relies on. Weep uses test tokens with no value, so nothing in these terms involves real money.</p>
      </section>

      <section id="law">
        <h2>Your rights under local law</h2>
        <p>Nothing in these terms takes away rights you have under the law where you live that can&apos;t be waived by agreement.</p>
      </section>

      <section id="updates">
        <h2>Updates to these terms</h2>
        <p>When we change these terms, we&apos;ll update this page and the date at the top. Earlier versions stay in the repository&apos;s history. If you keep using Weep after a change, the new terms apply.</p>
      </section>

      <section id="contact">
        <h2>Contact</h2>
        <p>Questions about these terms: <a href={CONTACT} target="_blank" rel="noreferrer">open an issue in the Weep repository</a>. Please don&apos;t post personal details there.</p>
      </section>
    </DocPage>
  );
}
