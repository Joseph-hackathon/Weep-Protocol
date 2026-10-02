# Weep Protocol 💧

**Web3 Tip Payroll & Autonomous Policy Distribution on Monad**

Tipping has evolved, but the infrastructure hasn't. Weep transforms opaque, manual tip pooling into a transparent, frictionless on-chain engine powered by AI, Chainlink CRE, and Monad.

## 🚀 Hackathon Tracks Addressed

1. **Chainlink CRE (Best Workflow with CRE):**
   Instead of unreliable frontend contract interactions, Weep features a fully operational Chainlink Runtime Environment (CRE) workflow (`chainlink-cre` directory). When a merchant types an AI policy rule, the Chainlink node intercepts the API, securely parses the prompt into JSON via LLM, and triggers an EVM transaction to Monad Testnet to update the `TipSplitter.sol` contract automatically.
2. **Monad (Best Cross-Border/Payments):**
   Built directly on Monad Testnet. Leverages Monad's ultra-fast finality to ensure tip splitting and payroll distribution is instantaneous. The smart contract uses a "Push" mechanism (`distributeTips`) so employees receive tips without ever needing to pay Monad gas fees.
3. **Privy:**
   Complete frictionless onboarding for all 3 user flows:
   - **Customers:** Can pay tips with credit cards or embedded wallets without managing seed phrases.
   - **Merchants:** Seamlessly connect wallets to update policies and manage the Tip Pool.
   - **Employees:** Connect via Privy to a Web3 Dashboard to track their securely pushed AUSD tips in real-time.
4. **Nansen (Best Use of Nansen):**
   **Nansen Smart KYC** integration. Before a merchant adds a new employee wallet to the payroll, Weep automatically scans the address against Nansen's API to fetch related wallet data and label risks, preventing Sybil attacks or honey-pot addresses from draining the tip pool.

## 🛠️ How it Works

1. **Customer Checkout:** A customer leaves a tip (e.g., 2 AUSD) through the checkout flow.
2. **AI Smart Policies (Merchant):** The merchant types a natural language rule for the shift: *"Today is extremely busy for the servers. Let's give 60% to front of house, 30% to kitchen, and 10% to the bar."*
3. **Chainlink CRE Execution:** The Chainlink CRE workflow computes the AI response, parses the `{"FOH": 60, "BOH": 30, "BAR": 10}` ratios, and trustlessly updates the Monad smart contract.
4. **Web3 Payroll (Employee):** The tip pool is distributed based on the AI-determined ratios. Employees check their Privy-powered dashboards to see their exact balance with zero gas-claim overhead.

## 📁 Repository Structure
- `/frontend`: Next.js web application with Privy, Wagmi, and Nansen API integration.
- `/contracts`: Hardhat environment for the `TipSplitter.sol` Monad Testnet smart contract.
- `/chainlink-cre`: The compiled WebAssembly (WASM) workflow definition targeting the Decentralized Oracle Network.

## 🔗 Live Demo & Links
- **Network:** Monad Testnet
- **Contract Address:** `0x1A245Dc83F286CA5A6833626E813776623f9F336`

*Built for the Monad Hackathon 2026*
