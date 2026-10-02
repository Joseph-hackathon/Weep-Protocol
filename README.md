# Weep Protocol

Web3 Tip Payroll & Autonomous Policy Distribution on Monad. Weep transforms opaque, manual tip pooling into a transparent, frictionless on-chain engine powered by AI, Chainlink CRE, and Monad.

Legacy tip management processes are slow, admin-heavy, and lack transparency for workers. Weep solves this by bringing accountability, natural language AI parsing, and instant Web3 payouts directly to the point-of-sale.

## How it works

```mermaid
flowchart TD
    subgraph FRONTEND["Merchant Portal"]
        POLICY["Merchant inputs policy:<br/>'60% to servers, 30% to kitchen...'"]
        POLICY --> SUBMIT
    end

    subgraph CHAINLINK["Chainlink CRE"]
        LLM["Gemini 1.5 JSON Parser"]
        SUBMIT -->|Workflow Trigger| LLM
        LLM -->|Parse ratios: FOH/BOH/BAR| CRE_TX
    end

    subgraph SMART_CONTRACT["Monad Testnet"]
        CRE_TX["Update TipSplitter.sol"]
        TIP_POOL["Customer Tips (AUSD)"]
        DISTRIBUTE["Auto-Distribute (Push)"]
        
        CRE_TX --> DISTRIBUTE
        TIP_POOL --> DISTRIBUTE
    end
    
    subgraph NANSEN["Nansen Analytics"]
        KYC["Smart KYC / Sybil Check"]
        KYC -.->|Validate| DISTRIBUTE
    end

    subgraph WORKERS["Employee Dashboard (Privy)"]
        FOH["FOH Workers"]
        BOH["BOH Workers"]
        BAR["BAR Workers"]
        
        DISTRIBUTE --> FOH
        DISTRIBUTE --> BOH
        DISTRIBUTE --> BAR
    end

    style FRONTEND fill:#18181b,stroke:#27272a,color:#fff
    style CHAINLINK fill:#2563eb,stroke:#60a5fa,color:#fff
    style SMART_CONTRACT fill:#8b5cf6,stroke:#a855f7,color:#fff
    style NANSEN fill:#10b981,stroke:#34d399,color:#fff
    style WORKERS fill:#24292e,stroke:#fff,color:#fff
```

## Live Services & Integrations

| Component | Description |
|---|---|
| Frontend | Next.js App Router (Hosted on Vercel) |
| Smart Contract | `TipSplitter.sol` on Monad Testnet |
| Auth & Wallets | Privy (Seamless onboarding & Embedded Wallets) |
| Workflow & Oracle | Chainlink CRE (Decentralized Workflow Automation) |
| Analytics & Sybil | Nansen Smart KYC API |
| AI Parsing | Gemini 1.5 Pro |

## Quick Start

### 1. Run the local development server

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` to view the landing page.
- `/merchant`: Access the Merchant Portal to input AI tip policies.
- `/employee`: Access the Employee Dashboard to view distributed AUSD tips via Privy.

### 2. Contract Details
- **Network:** Monad Testnet
- **Address:** `0x1A245Dc83F286CA5A6833626E813776623f9F336`

### 3. Deploying Chainlink CRE Workflow
Navigate to the `chainlink-cre` directory to compile and upload the WASM workflow definition.

```bash
cd chainlink-cre
npm run compile
```

*Built for the Monad Hackathon*
