# Weep Protocol 💧

Weep Protocol transforms opaque, manual tip pooling into a transparent, frictionless on-chain engine powered by AI and the Monad blockchain. Built specifically for the **Monad Hackathon**.

## 🚀 Features

- **AI Smart Policies (Chainlink CRE Integration)**: Merchants can type their tip distribution rules in natural language (e.g., *"60% to FOH, 30% to BOH, 10% to Bar"*). An AI parses this and Chainlink CRE executes it securely on-chain.
- **Nansen Smart KYC**: Automatically scans employee wallets against Nansen's API to detect sybil attacks or honeypots before adding them to the payroll.
- **Web3 Push Payroll**: Instead of workers paying gas to "claim" tips, the `TipSplitter.sol` smart contract pushes AUSD tips directly into employee wallets securely and instantly.
- **Seamless Tipping**: Customers can easily tip using AUSD seamlessly with low-fee, high-speed transactions on Monad.

## 🛠️ Architecture

- **Frontend**: Next.js, Tailwind CSS, Framer Motion
- **Web3 Integration**: Wagmi, Viem, Privy (Embedded Wallets)
- **Smart Contracts**: Solidity (`TipSplitter.sol`), Monad Testnet
- **Oracles & AI**: Chainlink CRE (Runtime Environment), Google Gemini API
- **Analytics & Security**: Nansen API

## 📦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/Joseph-hackathon/Weep-Protocol.git
cd Weep-Protocol/frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Variables
Create a `.env.local` file in the `frontend` directory:
```
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NANSEN_API_KEY=your_nansen_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🔗 Deployed Contract
- **TipSplitter.sol** on Monad Testnet: `0x1A245Dc83F286CA5A6833626E813776623f9F336`

## 🏆 Hackathon Tracks
- Best Workflow with CRE (Chainlink)
- Best Use of Nansen
- Best Cross-Border Payments App on Monad (Agora)
- Privy Track
