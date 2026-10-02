"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { createConfig } from "@privy-io/wagmi";
import { monadTestnet } from "wagmi/chains"; 
import { http } from "viem";

const queryClient = new QueryClient();

export const config = createConfig({
  chains: [monadTestnet],
  transports: {
    [monadTestnet.id]: http(),
  },
});

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || "demo-app-id"}
      config={{
        loginMethods: ["wallet", "email", "google", "apple"],
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        appearance: {
          theme: "dark",
          accentColor: "#676FFF",
          logo: "/logo.png",
          walletList: ['metamask', 'detected_wallets', 'rainbow', 'wallet_connect']
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
