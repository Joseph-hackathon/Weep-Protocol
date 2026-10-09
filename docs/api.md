# API reference

The five server routes the Weep app calls. They run on the website's own server: the base URL is `https://weep-protocol.vercel.app` live, or `http://localhost:3000` locally. Every request and response body is JSON. The routes keep no data.

| Route | Does | Needs |
|---|---|---|
| [`POST /api/send/parse`](#post-apisendparse) | Reads a payment description into rows | `GEMINI_API_KEY` |
| [`POST /api/send/wallets`](#post-apisendwallets) | Finds or creates the wallet behind each email | `PRIVY_APP_SECRET`, sender's signature |
| [`POST /api/setup/parse`](#post-apisetupparse) | Reads a team description into people and a split | `GEMINI_API_KEY` |
| [`POST /api/setup/wallets`](#post-apisetupwallets) | Creates wallets for a team's emails | `PRIVY_APP_SECRET`, the business's signature for its own pool |
| [`POST /api/gas`](#post-apigas) | Covers the first network fee of a new email or passkey account | `PRIVY_APP_SECRET`, `GAS_SPONSOR_KEY`, the person's Privy session |

Payments never go through these routes. They are sent from the person's own wallet straight to the contracts, as described in [architecture.md](architecture.md).

---

## POST /api/send/parse

Turns a plain-words payment into rows for the Send review screen. The AI only classifies each person's share: `fixed` dollars, a `percent` of the total, or an `equal` share of what's left. It does no arithmetic. The app works out the exact cents with [`allocate.ts`](../frontend/src/app/allocate.ts).

**Request**

| Field | Type | Rules |
|---|---|---|
| `text` | string | Required. 1–6,000 characters after trimming |

**Response `200`**

| Field | Type | Meaning |
|---|---|---|
| `total` | number | Total in dollars as written; `0` if none was stated |
| `rows[]` | array | Up to 100, in the order written |
| `rows[].name` | string | As written, up to 40 characters; `Winner N` when people are only counted |
| `rows[].contact` | string | Email or `0x` wallet exactly as written; `""` if none |
| `rows[].mode` | `"fixed"` \| `"percent"` \| `"equal"` | How this person's share is set |
| `rows[].value` | number | Dollars for `fixed`, percent for `percent`, `0` for `equal` |
| `questions[]` | string[] | Up to 4 short questions about anything unclear; empty when all is clear |

**Example** (run against the live site on 8 Oct 2026):

```bash
curl -s https://weep-protocol.vercel.app/api/send/parse \
  -H 'content-type: application/json' \
  -d '{"text":"$60 to Sam (sam@test.dev), Ama (ama@test.dev) and Kai (kai@test.dev), Sam gets half"}'
```

```json
{
  "total": 60,
  "rows": [
    { "name": "Sam", "contact": "sam@test.dev", "mode": "percent", "value": 50 },
    { "name": "Ama", "contact": "ama@test.dev", "mode": "equal", "value": 0 },
    { "name": "Kai", "contact": "kai@test.dev", "mode": "equal", "value": 0 }
  ],
  "questions": []
}
```

The app turns this into $30.00, $15.00 and $15.00.

**Errors**

| Status | `error` | When | Retry? |
|---|---|---|---|
| 400 | `empty` | No text | No: send text |
| 400 | `too-long` | Over 6,000 characters | No: shorten it |
| 502 | `ai-failed` | Every model failed or returned invalid output | Yes |
| 503 | `not-configured` | No `GEMINI_API_KEY` on the server | No |

Models are tried newest first (`GEMINI_MODEL` if set, then `gemini-3.8-flash`, `gemini-3.5-flash`, `gemini-3.5-flash-lite`). The route moves on only when a model is unavailable (403, 404) or busy (429, 503). It uses temperature 0 and a fixed JSON schema.

---

## POST /api/send/wallets

Returns the wallet behind each email someone is about to pay. Privy returns the person's existing wallet, or creates a non-custodial one they open by signing in with that email. The same email always returns the same wallet.

Any sender can call this route, but only with a message they've just signed that names the exact emails. That stops anyone forging, replaying or altering a request.

**Request**

| Field | Type | Rules |
|---|---|---|
| `emails` | string[] | 1–100 valid emails. They are trimmed, lowercased and deduplicated |
| `issuedAt` | string | ISO 8601 time. Must be no more than 10 minutes old and no more than 1 minute in the future |
| `signer` | `0x…` | The sender's wallet address |
| `signature` | `0x…` | `personal_sign` by `signer` of the message below |

The signed message is built by [`sendMessage`](../frontend/src/app/send-message.ts). It uses the sorted, lowercased emails, joined by `", "`:

```text
Weep: reach these people by email
Payments: <WeepPay address, NEXT_PUBLIC_WEEP_PAY>
Emails: ama@example.com, kai@example.com
Issued: 2026-10-08T21:00:00.000Z
```

**Example** (Node 20+, `npm i viem`):

```js
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const account = privateKeyToAccount(generatePrivateKey()); // any wallet can ask
const emails = ["ama@example.com", "kai@example.com"];
const issuedAt = new Date().toISOString();
const PAY = "0x…"; // the live WeepPay address (NEXT_PUBLIC_WEEP_PAY)
const message = `Weep: reach these people by email\nPayments: ${PAY}\nEmails: ${[...emails].sort().join(", ")}\nIssued: ${issuedAt}`;

const res = await fetch("https://weep-protocol.vercel.app/api/send/wallets", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ emails, issuedAt, signer: account.address, signature: await account.signMessage({ message }) }),
});
console.log(await res.json());
```

**Response `200`**

```json
{ "wallets": [ { "email": "ama@example.com", "wallet": "0x…" }, { "email": "kai@example.com", "wallet": "0x…" } ] }
```

`wallet` is `null` for any email Privy couldn't resolve just then. The Send page then stops before paying anyone.

**Errors**

| Status | `error` | When |
|---|---|---|
| 400 | `bad-emails` | No emails, more than 100, or one isn't an email |
| 401 | `unsigned` | `signer`, `signature` or `issuedAt` missing |
| 401 | `expired` | `issuedAt` is older than 10 minutes, or in the future |
| 401 | `bad-signature` | The signature doesn't match `signer` and the message |
| 503 | `not-configured` | No `PRIVY_APP_SECRET` on the server |

---

## POST /api/setup/parse

Reads a business owner's description of their team into people and a tip split, for the Merchant Portal to review. Nothing is saved.

**Request**

| Field | Type | Rules |
|---|---|---|
| `text` | string | Required. 1–4,000 characters after trimming |

**Response `200`**

| Field | Type | Meaning |
|---|---|---|
| `employees[]` | array | `{ name, email, group }`. `group` is `floor`, `kitchen` or `bar`; `email` is lowercase or `""` |
| `pool` | object | `{ foh, boh, bar }`: whole percentages for floor, kitchen and bar. If none is given, the default is 60/30/10, with a note |
| `notes[]` | string[] | Up to 5 plain notes, such as a missing email or a split that doesn't add up to 100 |

**Example** (live, 8 Oct 2026):

```bash
curl -s https://weep-protocol.vercel.app/api/setup/parse \
  -H 'content-type: application/json' \
  -d '{"text":"Sam (sam@test.dev) is a server, Kai (kai@test.dev) cooks. Split 70% floor, 30% kitchen."}'
```

```json
{
  "employees": [
    { "name": "Sam", "email": "sam@test.dev", "group": "floor" },
    { "name": "Kai", "email": "kai@test.dev", "group": "kitchen" }
  ],
  "pool": { "foh": 70, "boh": 30, "bar": 0 },
  "notes": []
}
```

**Errors**: the same as `/api/send/parse`, with a 4,000-character limit.

---

## POST /api/setup/wallets

Makes sure every person on a business's team has a wallet before they ever sign in. A business may only do this for its own pool. The server accepts the signer if either:

- the signer is the pool's `owner()`, for a pool created by WeepPools; or
- the pool doesn't exist yet and `WeepPools.predict(signer)` equals it, meaning the signer's own pool is about to be created there.

**Request**: the same fields as [`/api/send/wallets`](#post-apisendwallets), with 1–50 emails, plus:

| Field | Type | Rules |
|---|---|---|
| `pool` | `0x…` | The business's pool address, or where `WeepPools.predict(signer)` says it will be created |

The signed message, built by [`setupMessage`](../frontend/src/app/setup-message.ts), is:

```text
Weep team setup
Pool: <pool address, lowercase>
Emails: <sorted, lowercased emails joined by ", ">
Issued: <issuedAt>
```

**Response `200`**

```json
{ "wallets": [ { "email": "sam@test.dev", "wallet": "0x…", "created": true } ] }
```

`created` is `true` when Privy made a new wallet for that email.

**Errors**: the same as `/api/send/wallets`, plus:

| Status | `error` | When |
|---|---|---|
| 401 | `unsigned` | Also returned when `pool` is missing or isn't an address |
| 403 | `not-owner` | The signer doesn't run that pool and isn't about to create it |

---

## POST /api/gas

Covers the network fee for someone who signed in with email, so their first payment needs nothing but an email. The route sends 0.1 test MON from Weep's sponsor wallet to the person's own Privy email wallet. The app calls it before a payment, a team setup or a payout, only when that wallet holds less than 0.05 MON.

**Request**

| Part | Value |
|---|---|
| Header `Authorization` | `Bearer <Privy access token>` of the signed-in person |
| Body `address` | Their wallet address |

The route gives MON only when every check passes:

- the token is a valid Privy session;
- `address` is that person's own Privy email wallet, not a wallet they connected;
- the wallet holds less than 0.05 MON and has sent fewer than 20 transactions;
- the sponsor wallet would keep at least 1 MON afterwards.

**Responses**

| Status | Body | When |
|---|---|---|
| 200 | `{ "covered": true, "hash": "0x…" }` | 0.1 MON sent; `hash` is the transaction |
| 200 | `{ "covered": false, "reason": "enough" }` | The wallet already has enough |
| 400 | `{ "error": "bad-address" }` | `address` missing or invalid |
| 401 | `{ "error": "signed-out" }` | No valid Privy session |
| 403 | `{ "error": "not-your-wallet" }` | The address isn't the person's own email wallet |
| 429 | `{ "error": "limit" }` | The wallet has already made 20 or more transactions |
| 503 | `{ "error": "not-configured" }` or `{ "error": "empty" }` | Cover is switched off, or the sponsor wallet is running low |
| 502 | `{ "error": "failed" }` | The transfer couldn't be sent |

When the route can't help, the app points the person to [Monad's faucet](https://faucet.monad.xyz) instead.
