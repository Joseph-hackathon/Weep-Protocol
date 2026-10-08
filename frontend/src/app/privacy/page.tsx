import type { Metadata } from "next";
import Link from "next/link";
import DocPage, { CONTACT, REPO } from "../DocPage";

export const metadata: Metadata = {
  title: "Privacy notice · Weep",
  description: "What Weep collects, why, who else sees it, what is public on Monad, and the choices you have.",
};

const contents = [
  { id: "who", label: "Who we are" },
  { id: "collect", label: "What we use, and why" },
  { id: "public", label: "What is public on Monad" },
  { id: "ai", label: "Descriptions read by AI" },
  { id: "paid", label: "If someone paid your email" },
  { id: "browser", label: "What stays in your browser" },
  { id: "not", label: "What we don't do" },
  { id: "sharing", label: "Who else processes data" },
  { id: "transfers", label: "Where data is processed" },
  { id: "retention", label: "How long data is kept" },
  { id: "rights", label: "Your choices and rights" },
  { id: "bases", label: "Legal bases" },
  { id: "security", label: "Security" },
  { id: "children", label: "Children" },
  { id: "updates", label: "Changes to this notice" },
  { id: "contact", label: "Contact and complaints" },
];

export default function Page() {
  return (
    <DocPage
      path="/privacy"
      title="Privacy notice"
      lead="This notice explains what information Weep uses, why, who else sees it, and the choices you have. It describes how the service works today."
      glance={[
        <>Weep has no accounts database of its own. Sign-in and wallets are handled by Privy.</>,
        <>Payments are recorded on Monad, a public network. Wallet addresses, amounts and times are visible to anyone, forever. Emails are never put on Monad.</>,
        <>When you describe a payment in words, the text goes to Google&apos;s Gemini API to be read. Weep doesn&apos;t store it.</>,
        <>No ads, no tracking cookies, no analytics, and we never sell data.</>,
      ]}
      contents={contents}
    >

      <section id="who">
        <h2>Who we are</h2>
        <p>Weep is provided by the team that maintains the open-source <a href={REPO} target="_blank" rel="noreferrer">Weep Protocol project</a> (&ldquo;Weep&rdquo;, &ldquo;we&rdquo;). This notice covers the website at weep-protocol.vercel.app and the Weep smart contracts it uses. Weep runs on Monad testnet with test tokens. See the <Link href="/terms">Terms of use</Link>.</p>
      </section>

      <section id="collect">
        <h2>What we use, and why</h2>
        <div className="doc-table" role="region" aria-label="Information Weep uses" tabIndex={0}>
          <table>
            <thead>
              <tr><th scope="col">Information</th><th scope="col">Where it comes from</th><th scope="col">Why</th><th scope="col">Who else sees it</th></tr>
            </thead>
            <tbody>
              <tr><th scope="row">Your email address</th><td data-label="Where it comes from">You, when you sign in with email</td><td data-label="Why">To send your one-time code and link you to your wallet</td><td data-label="Who else sees it">Privy</td></tr>
              <tr><th scope="row">Your wallet address</th><td data-label="Where it comes from">Your wallet, or the one Privy made for you</td><td data-label="Why">To show your balance and send payments you approve</td><td data-label="Who else sees it">Public on Monad</td></tr>
              <tr><th scope="row">Emails of people you pay</th><td data-label="Where it comes from">You, in Send</td><td data-label="Why">To find, or have Privy create, each person&apos;s wallet</td><td data-label="Who else sees it">Privy</td></tr>
              <tr><th scope="row">What you type to describe a payment or a team</th><td data-label="Where it comes from">You, in Send or the Merchant Portal</td><td data-label="Why">To draft the list of people and shares for you to check</td><td data-label="Who else sees it">Google (Gemini API)</td></tr>
              <tr><th scope="row">Your team&apos;s first names, wallets and groups</th><td data-label="Where it comes from">The business owner, in the Merchant Portal</td><td data-label="Why">So guests can tip a person by name, and team tips can be split</td><td data-label="Who else sees it">Public on Monad</td></tr>
              <tr><th scope="row">Payments: wallets, amounts and times</th><td data-label="Where it comes from">Monad</td><td data-label="Why">To show receipts, what you&apos;ve received and team tips</td><td data-label="Who else sees it">Public on Monad</td></tr>
              <tr><th scope="row">The name on your pay-me link</th><td data-label="Where it comes from">You, if you add one</td><td data-label="Why">To show on the link and code you share</td><td data-label="Who else sees it">Anyone you share the link with</td></tr>
              <tr><th scope="row">Technical data such as IP address and browser type</th><td data-label="Where it comes from">Your browser, automatically</td><td data-label="Why">To deliver the website, keep it working and stop abuse</td><td data-label="Who else sees it">Vercel, Privy and the Monad network endpoint</td></tr>
            </tbody>
          </table>
        </div>
        <p>When you look up emails in Send, your wallet signs a short message naming those emails. The signature only proves that the request came from you. It doesn&apos;t move any money.</p>
        <p>If you choose <em>Scan</em> on the Tip page, your camera is used in your browser to read the code. Images never leave your device.</p>
      </section>

      <section id="public">
        <h2>What is public on Monad</h2>
        <p>Monad is a public blockchain. Everything recorded on it can be seen by anyone, through the <a href="https://testnet.monadexplorer.com" target="_blank" rel="noreferrer">Monad testnet explorer</a>, and can&apos;t be changed or deleted, by us or anyone else. That includes:</p>
        <ul>
          <li>every payment: the wallets involved, the amount and the time;</li>
          <li>for business pools: the first names, wallets and groups of the team, and each payout.</li>
        </ul>
        <p>Weep never writes emails to Monad. Each Send payment carries a reference code, which is a one-way fingerprint of its recipients and amounts and contains no names or emails.</p>
      </section>

      <section id="ai">
        <h2>Descriptions read by AI</h2>
        <p>Text you type into Send&apos;s description box, or into the Merchant Portal&apos;s team setup, is sent from our server to Google&apos;s Gemini API, which turns it into a draft list. Weep doesn&apos;t save that text. Google handles it under the <a href="https://ai.google.dev/gemini-api/terms" target="_blank" rel="noreferrer">Gemini API terms</a>, which, depending on the plan in use, may allow Google to keep it for a limited time and to use it to improve its products. Write only what the payment needs. To skip the AI completely, choose <em>Or add people yourself</em>.</p>
      </section>

      <section id="paid">
        <h2>If someone paid your email</h2>
        <p>If someone paid you on Weep using your email, they gave it to us, and we asked Privy for the wallet linked to it. If you didn&apos;t have one, Privy created one. Nothing was sent to your inbox by Weep. Sign in to Weep with that email to see the payment in <Link href="/money">My money</Link>. To have the account Privy created deleted, <a href="#rights">contact us</a>.</p>
      </section>

      <section id="browser">
        <h2>What stays in your browser</h2>
        <p>Weep doesn&apos;t set its own cookies. It keeps a few conveniences in your browser&apos;s local storage, which never leave your device unless you share them:</p>
        <ul>
          <li>whether you last chose Individual or Business, and how you last signed in (including that email, so it can be offered first next time);</li>
          <li>the name for your pay-me link, and whether you hid your balance;</li>
          <li>a list of payments you&apos;ve received, so they show straight away next time;</li>
          <li>for business owners, the last team you saved;</li>
          <li>whether you signed out.</li>
        </ul>
        <p>Privy also keeps your session in your browser so you stay signed in. Clearing this site&apos;s data in your browser removes all of the above.</p>
      </section>

      <section id="not">
        <h2>What we don&apos;t do</h2>
        <ul>
          <li>We don&apos;t sell or rent personal information, or share it for advertising.</li>
          <li>We don&apos;t use analytics, advertising or tracking tools.</li>
          <li>We don&apos;t make decisions about you by automated means that have legal or similarly significant effects. The AI drafts lists, and you decide.</li>
        </ul>
      </section>

      <section id="sharing">
        <h2>Who else processes data</h2>
        <p>We share information only with the services that make Weep work, and only for that purpose. Each processes it under its own policy.</p>
        <ul>
          <li><strong>Privy</strong>: sign-in by email code, wallets for email users, and the email-to-wallet lookup. <a href="https://www.privy.io/privacy-policy" target="_blank" rel="noreferrer">Privy privacy policy</a>.</li>
          <li><strong>Google</strong>: reads payment and team descriptions through the Gemini API. <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google privacy policy</a>.</li>
          <li><strong>Vercel</strong>: hosts the website and our server code. <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">Vercel privacy policy</a>.</li>
          <li><strong>The Monad network endpoint</strong>: your browser reads balances and payments from Monad&apos;s public endpoint, which sees those requests.</li>
          <li><strong>WalletConnect</strong>: only if you connect a wallet through the wallet directory, to relay the connection.</li>
        </ul>
        <p>We may also disclose information if the law requires it, or to protect people from fraud or harm.</p>
      </section>

      <section id="transfers">
        <h2>Where data is processed</h2>
        <p>Privy, Google and Vercel are based in the United States and may process data there and in other countries. Monad is a global network with no single location.</p>
      </section>

      <section id="retention">
        <h2>How long data is kept</h2>
        <ul>
          <li><strong>Weep&apos;s server</strong> keeps no database of users or payments. If an email lookup fails, the email may appear briefly in our hosting error logs, which our host deletes automatically after a short period.</li>
          <li><strong>Privy</strong> keeps sign-in emails and their wallets until the account is deleted.</li>
          <li><strong>Google</strong> keeps description text as its Gemini API terms allow.</li>
          <li><strong>Monad</strong> keeps payments and team records permanently.</li>
          <li><strong>Your browser</strong> keeps Weep&apos;s conveniences until you clear them.</li>
        </ul>
      </section>

      <section id="rights">
        <h2>Your choices and rights</h2>
        <p>You can use Weep with a wallet you already have instead of an email. You can skip the AI by adding people yourself. You can clear what Weep keeps in your browser at any time.</p>
        <p>Depending on where you live, you may have the right to ask for access to, correction or deletion of your personal information, to object to or restrict its use, or to receive a copy. For example, these rights apply under the GDPR in Europe and the UK, Kenya&apos;s Data Protection Act, and California&apos;s privacy law. To make a request, <a href={CONTACT} target="_blank" rel="noreferrer">open an issue in the Weep repository</a> asking for a private way to reach us, and don&apos;t include personal details in the issue. We may need to confirm the request is yours, for example by asking you to sign in with the email concerned.</p>
        <p>We can&apos;t change or delete anything recorded on Monad, because no one can.</p>
      </section>

      <section id="bases">
        <h2>Legal bases</h2>
        <p>Where laws such as the GDPR apply, we rely on two bases. The first is providing the service you ask for: sign-in, email lookups, reading your descriptions and payments. The second is our legitimate interest in keeping Weep secure and free from abuse: technical data and logs.</p>
      </section>

      <section id="security">
        <h2>Security</h2>
        <p>Weep never holds keys or money. Email lookups require a fresh signature from the sender&apos;s wallet. Setting up a business team requires the pool owner&apos;s signature. Server secrets are kept in our host&apos;s encrypted environment settings, not in code, and the site is served over HTTPS. No system is perfectly secure. Weep&apos;s contracts haven&apos;t been audited. To report a problem, see our <a href={`${REPO}/blob/main/SECURITY.md`} target="_blank" rel="noreferrer">security policy</a>.</p>
      </section>

      <section id="children">
        <h2>Children</h2>
        <p>Weep is for people aged 18 and over. We don&apos;t knowingly collect information from children. If you believe a child has used Weep, contact us and we&apos;ll help remove what we can.</p>
      </section>

      <section id="updates">
        <h2>Changes to this notice</h2>
        <p>When Weep starts using information in a new way, or adds a new service provider, we&apos;ll update this notice and the date at the top before the change goes live. Earlier versions stay in the repository&apos;s history.</p>
      </section>

      <section id="contact">
        <h2>Contact and complaints</h2>
        <p>For privacy questions or requests, <a href={CONTACT} target="_blank" rel="noreferrer">open an issue in the Weep repository</a>. Don&apos;t include personal details in the issue; we&apos;ll arrange a private way to talk. You can also complain to your local data protection authority, such as the Office of the Data Protection Commissioner in Kenya or the supervisory authority in your EU country.</p>
      </section>
    </DocPage>
  );
}
