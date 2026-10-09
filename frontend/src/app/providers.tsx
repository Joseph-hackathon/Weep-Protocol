"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { monadTestnet } from "viem/chains";

/*
 * Privy only. It wraps the account dock (AccountArea), not the page, so no page waits for wallet code
 * to paint. Reads go through viem directly (ConnectButton); wagmi and react-query were unused weight.
 */

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmujnrzih03xh0dl9k6itwgws"}
      config={{
        // Weep's own sign-in window: email code, a passkey, or a wallet.
        loginMethods: ["email", "passkey", "wallet"],
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        appearance: {
          theme: "#0d0a18",
          accentColor: "#a996ff",
          logo: "/weep-mark.png", // same cropped mark as everywhere else
          landingHeader: "Connect a wallet",
          showWalletLoginFirst: true,
          walletChainType: "ethereum-only",
          // Used only by the "All wallets" directory (Weep's own window lists installed wallets first):
          // installed, the most common, then WalletConnect's searchable directory of 600+ wallets.
          walletList: ["detected_ethereum_wallets", "metamask", "phantom", "coinbase_wallet", "okx_wallet", "rainbow", "wallet_connect"],
        },
        // People who sign in with email get a wallet made for them automatically.
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          }
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
