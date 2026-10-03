# Weep Protocol: Official Documentation

## 1. Introduction

### 1.1 What is Weep Protocol?
Weep Protocol is a **Universal Smart Tipping and Micro-Payroll Protocol** built on the Monad Network. It is designed to work across the entire service and gig economy—from local coffee shops and restaurants, to hotels, and gig-apps like Uber or DoorDash. 

Instead of being locked into a rigid "Front-of-House / Back-of-House" restaurant model, Weep is fundamentally a **dynamic payment routing engine**. A sender can input a single tip amount, clearly identify the specific person (or team) they want to tip, and execute the transaction once. Weep ensures the tip is autonomously distributed to the correct recipient(s) based on established on-chain settings and AI-driven policies.

### 1.2 The Problem We Solve
Traditional tipping and micro-payments face three critical bottlenecks:
1. **Platform Lock-in & High Fees:** Web2 gig platforms (like ride-sharing or delivery apps) take massive cuts and delay payouts.
2. **Administrative Overhead:** For team-based tipping (like hospitality), managers spend hours calculating complex pooling spreadsheets, leading to legal liabilities and mistrust.
3. **Friction in Web3 Payments:** Users don't want to manage seed phrases to send a tip, and service workers don't want to pay gas fees to claim their hard-earned money.

### 1.3 The Weep Solution
Weep eliminates these bottlenecks through a completely decentralized, gasless (for the receiver), and AI-programmable infrastructure:
- **Direct-to-Individual:** Tip a specific person instantly.
- **Smart Pools:** Tip a team, and let Chainlink CRE + AI dynamically split the funds based on who is actively on shift.
- **Zero-Friction:** Privy embedded wallets ensure users and workers only need an email or social login.

---

## 2. Core Architecture

Weep's architecture is a composite of cutting-edge Web3 primitives working in harmony.

### 2.1 Settlement Layer (Monad Testnet)
At the base level, Weep requires ultra-fast finality and low fees. Monad’s parallel execution EVM provides the bandwidth necessary for thousands of micro-tips to be processed per second. 
- **Push-Based Payouts:** Unlike traditional DeFi where users must "claim" tokens (paying gas), Weep uses a push model. The Smart Contract auto-distributes AUSD (stablecoin) directly into the worker's wallet.

### 2.2 Oracle & Workflow Engine (Chainlink CRE)
Weep utilizes the **Chainlink Runtime Environment (CRE)** to bridge off-chain dynamic logic with on-chain execution.
- **Use Case:** If a sender tips a "Pool" (e.g., a restaurant staff), the Chainlink CRE invokes a Gemini 1.5 LLM to parse the merchant's natural language policy (e.g., *"Split today's tips equally among the 3 workers on shift"*), generates an exact JSON ratio payload, and triggers the Monad contract.

### 2.3 Identity & Authentication (Privy & Nansen)
- **Privy:** Handles all wallet creation. Senders can pay via credit card or embedded wallets. Receivers get an auto-generated wallet linked to their email, accessible via the Weep Dashboard.
- **Nansen Smart KYC:** Before any tip is routed to a new receiver, Nansen scans the destination address. This prevents sybil attacks, bot-farming in creator pools, and ensures compliance.

---

## 3. Key Concepts & Payment Models

Weep supports two primary payment topologies, making it universally adaptable:

### 3.1 Direct-to-Individual Tipping
The simplest and most powerful flow. 
* **Scenario:** A customer enjoys a coffee made by "Alice", or wants to tip their Uber driver "Bob" directly.
* **Execution:** The sender selects the individual. The sender inputs `10 AUSD`. The Weep Protocol routes `10 AUSD` directly to the individual's Privy-generated Monad address. There is no middleman, no platform fee, and no delay. 

### 3.2 Dynamic Team Pooling
* **Scenario:** A customer wants to tip the entire "Saturday Night Shift" at a restaurant or a hotel's valet team.
* **Execution:** The sender sends `50 AUSD` to a specific **Pool ID**. The protocol checks the established settings for that Pool ID. If the admin has set a dynamic rule (e.g., "70% to active servers, 30% to active kitchen staff"), Chainlink CRE executes the math and routes the exact fractional amounts to the respective individuals' wallets.

---

## 4. User Flows

### 4.1 The Sender (Customer / Tipper)
1. Sender scans a QR code (at a table, in a hotel room) or clicks a Weep Link in their gig-app receipt.
2. Sender sees the profile of the individual or team they are tipping.
3. Sender selects the amount and pays (via Web3 Wallet or Fiat-on-Ramp via Privy).
4. Transaction is instantly verified on Monad.

### 4.2 The Receiver (Employee / Creator)
1. Receiver gets an SMS or Email notification: *"You received a 10 AUSD tip!"*
2. Receiver logs into the Weep Dashboard using their email (Privy).
3. Receiver sees their balance update in real-time. The funds are already in their non-custodial wallet—no "Claim" button required.

### 4.3 The Administrator (Merchant / Platform Owner)
1. Admin creates a "Weep Workspace" for their business or platform.
2. Admin invites Receivers via email. Nansen verifies the newly created receiver wallets.
3. Admin types natural language rules to define how "Pool" tips are split, which Chainlink CRE locks into the smart contract.

---

## 5. Developer Integration Guide

Weep is designed to be highly composable. Developers can integrate Weep into POS systems, Gig-Apps, or Web platforms.

### 5.1 Invoking a Direct Tip
To initiate a tip to a specific user from your own frontend, invoke the `TipSplitter.sol` contract on Monad:

```typescript
// Example wagmi/viem interaction
import { writeContract } from '@wagmi/core';
import { weepAbi } from './abis';

await writeContract({
  address: WEEP_CONTRACT_ADDRESS,
  abi: weepAbi,
  functionName: 'tipIndividual',
  args: [
    receiverAddress, // The specific employee's wallet
    amountInWei      // The tip amount
  ],
});
```

### 5.2 Invoking a Pool Tip
```typescript
await writeContract({
  address: WEEP_CONTRACT_ADDRESS,
  abi: weepAbi,
  functionName: 'tipPool',
  args: [
    poolId,     // The ID of the restaurant/team
    amountInWei 
  ],
});
```

---

## 6. Future Roadmap
As Weep scales its infrastructure, we plan to expand into entirely new verticals and capabilities:
1. **Creator Economy & Online Tipping:** Expanding the protocol beyond physical hospitality to digital environments. Weep will allow users to tip Twitch streamers, YouTubers, and open-source developers with zero platform fees (bypassing the 30% cut taken by legacy platforms).
2. **Cross-Chain Tipping:** Allowing senders to tip in USDC on Base/Optimism, while receivers get settled on Monad via CCIP.
3. **Social Graph Integration:** Integrating Lens Protocol or Farcaster so users can tip directly based on social handles rather than scanning QR codes.
4. **DeFi Yield on Unspent Tips:** Automatically staking resting tip balances in Aave to generate passive income for service workers.

---
*Weep Protocol — Programmable fairness for the modern service economy.*

## 7. Resources & Market Research
- [Pew Research Center: The State of Tipping in the U.S.](https://www.pewresearch.org/2023/11/09/services-and-industries-where-people-tip/) - Background on the scale and complexity of the US tipping culture.
- [U.S. Department of Labor: Tip Regulations (FLSA)](https://www.dol.gov/agencies/whd/flsa/tips) - Context on the strict legal compliance required for manual tip pooling.
- [SundayApp: Tipping Trends for Restaurants in 2025](https://sundayapp.com/en-gb/tipping-trends-for-restaurants-in-2025/) - Research on modern tipping behaviors and the shift towards digital gratuity.
- [RestaurantOnline: Half of consumers still don’t trust restaurants to pass on tips](https://www.restaurantonline.co.uk/Article/2025/10/01/half-of-consumers-still-dont-trust-restaurants-to-pass-on-tips-according-to-new-research/) - Validates Weep's core thesis that the industry suffers from a fundamental lack of trust and transparency.
- [HospitalityNet: Smooth operations: why the next wave of hotel tech is invisible](https://www.hospitalitynet.org/opinion/4129380.html) - Highlights the urgent need for backend automation (like Weep's Smart Contracts) to reduce administrative overhead in hospitality.
