"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, ShieldCheck, Wallet, Fingerprint, LogIn } from "lucide-react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import { createWalletClient, custom, parseUnits } from "viem";
import { monadTestnet } from "viem/chains";

const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const TIP_SPLITTER_ADDRESS = "0x1A245Dc83F286CA5A6833626E813776623f9F336";

export default function CustomerPage() {
  const [amount, setAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [status, setStatus] = useState<"idle" | "signing" | "processing" | "success">("idle");
  const [txHash, setTxHash] = useState<string>("");

  const { login, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];

  const predefinedAmounts = [2, 5, 10, 20];

  const handleAmountClick = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.value);
    setAmount(null);
  };

  const getFinalAmount = () => {
    if (amount !== null) return amount;
    const parsed = parseFloat(customAmount);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleTip = async () => {
    const finalAmount = getFinalAmount();
    if (finalAmount <= 0) return;
    if (!authenticated || !activeWallet) {
      login();
      return;
    }

    try {
      setStatus("signing");
      
      await activeWallet.switchChain(monadTestnet.id);
      const provider = await activeWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: activeWallet.address as `0x${string}`,
        chain: monadTestnet,
        transport: custom(provider)
      });
      
      const hash = await walletClient.writeContract({
        address: AUSD_ADDRESS as `0x${string}`,
        abi: [{
          "name": "transfer",
          "type": "function",
          "stateMutability": "nonpayable",
          "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
          "outputs": [{"name": "", "type": "bool"}]
        }],
        functionName: 'transfer',
        args: [TIP_SPLITTER_ADDRESS as `0x${string}`, parseUnits(finalAmount.toString(), 18)],
      });

      setStatus("processing");
      
      setTimeout(() => {
        setTxHash(hash);
        setStatus("success");
      }, 1500);

    } catch (error: any) {
      console.error(error);
      setStatus("idle");
      if (error.message && error.message.includes("reverted")) {
        alert("Transaction reverted! You likely don't have enough AUSD balance or Monad gas.");
      }
    }
  };

  const handleMintAUSD = async () => {
    try {
      if (!activeWallet) return;
      await activeWallet.switchChain(monadTestnet.id);
      const provider = await activeWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: activeWallet.address as `0x${string}`,
        chain: monadTestnet,
        transport: custom(provider)
      });

      await walletClient.writeContract({
        address: AUSD_ADDRESS as `0x${string}`,
        abi: [{
          "name": "mint",
          "type": "function",
          "stateMutability": "nonpayable",
          "inputs": [{"name": "to", "type": "address"}, {"name": "amount", "type": "uint256"}],
          "outputs": []
        }],
        functionName: 'mint',
        args: [activeWallet.address as `0x${string}`, parseUnits("100", 18)],
      });
      alert("Successfully minted 100 AUSD for testing!");
    } catch (error) {
      console.error(error);
      alert("Failed to mint AUSD. Ensure you have Monad gas.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#6E54FF] selection:text-white">
      
      {/* Clean Header */}
      <nav className="w-full bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[15px] font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" className="w-6 h-6 rounded-md mix-blend-screen" alt="Weep Logo" />
            <span className="text-[15px] font-medium">Weep</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
        <div className="w-full max-w-[420px] z-10">
          <AnimatePresence mode="wait">
            {status === "idle" && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-[#0a0a0a] p-8 md:p-10 rounded-[32px] border border-white/5 shadow-2xl"
              >
                <div className="text-center mb-8">
                  <div className="w-24 h-24 bg-[#111111] rounded-[24px] flex items-center justify-center mx-auto mb-5 border border-white/10 overflow-hidden p-2">
                    <img src="/logo.png" className="w-full h-full object-contain mix-blend-screen" alt="Store Logo" />
                  </div>
                  <h1 className="text-3xl font-medium mb-1">Central Cafe</h1>
                  <p className="text-white/40 text-[15px] font-medium">Tip securely via Monad AUSD</p>
                </div>

                {!authenticated ? (
                  <div className="mb-8 bg-black p-4 rounded-2xl border border-white/5 flex flex-col items-center gap-3">
                    <div className="p-3 bg-[#6E54FF]/10 rounded-full text-[#6E54FF]">
                      <LogIn className="w-5 h-5" />
                    </div>
                    <p className="text-[13px] text-white/40 text-center font-medium">Connect wallet or email to tip.</p>
                    <button
                      onClick={login}
                      className="w-full py-3 bg-white hover:bg-white/90 text-black rounded-full font-medium transition-colors text-[15px]"
                    >
                      Connect to Tip
                    </button>
                  </div>
                ) : (
                  <div className="mb-8 bg-black p-4 rounded-2xl border border-white/5 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-[13px] text-white/40 font-medium px-1">
                      <div className="flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-[#6E54FF]" />
                        <span>{activeWallet?.address?.slice(0, 6)}...{activeWallet?.address?.slice(-4)}</span>
                      </div>
                      <button onClick={logout} className="hover:text-white transition-colors">Disconnect</button>
                    </div>
                    <button onClick={handleMintAUSD} className="w-full py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors text-[13px]">
                      Get Test AUSD
                    </button>
                  </div>
                )}

                <div className="mb-8">
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {predefinedAmounts.map((val) => (
                      <button
                        key={val}
                        onClick={() => handleAmountClick(val)}
                        className={`py-3 rounded-xl font-medium transition-all text-[15px] ${
                          amount === val
                            ? "bg-[#6E54FF] text-white"
                            : "bg-black border border-white/5 text-white/70 hover:border-white/20"
                        }`}
                      >
                        ${val}
                      </button>
                    ))}
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 font-medium">$</span>
                    <input
                      type="number"
                      placeholder="Custom Amount"
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      className="w-full bg-black border border-white/5 rounded-xl py-3 pl-8 pr-4 text-white placeholder-white/20 focus:outline-none focus:border-[#6E54FF] transition-colors font-medium"
                    />
                  </div>
                </div>

                <button
                  onClick={handleTip}
                  disabled={getFinalAmount() <= 0}
                  className="w-full py-4 bg-white text-black rounded-full font-medium text-[16px] hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Send Tip
                </button>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-[12px] text-white/30 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secured by Monad 1s Finality & Privy</span>
                </div>
              </motion.div>
            )}

            {status === "signing" && (
              <motion.div
                key="signing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a0a0a] p-10 rounded-[32px] border border-white/5 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 relative border border-white/5">
                  <Fingerprint className="w-6 h-6 text-[#6E54FF] animate-pulse" />
                </div>
                <h2 className="text-xl font-medium mb-2">Confirming Transaction</h2>
                <p className="text-white/40 text-[15px] font-medium">Please sign in your wallet popup.</p>
              </motion.div>
            )}

            {status === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a0a0a] p-10 rounded-[32px] border border-white/5 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <div className="w-6 h-6 border-2 border-[#6E54FF] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <h2 className="text-xl font-medium mb-2">Processing on Monad</h2>
                <p className="text-white/40 text-[15px] font-medium">Settling via Chainlink CRE...</p>
              </motion.div>
            )}

            {status === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0a0a0a] p-10 rounded-[32px] border border-white/5 shadow-2xl text-center"
              >
                <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                <h2 className="text-xl font-medium mb-2">Tip Delivered!</h2>
                <p className="text-white/40 text-[15px] font-medium mb-8">Funds instantly routed to staff.</p>
                
                <a 
                  href={`https://testnet.monadvision.com/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full block py-3 bg-white/5 hover:bg-white/10 text-white rounded-full font-medium transition-colors text-[15px] mb-3"
                >
                  View on Explorer
                </a>
                
                <button
                  onClick={() => {
                    setStatus("idle");
                    setAmount(null);
                    setCustomAmount("");
                  }}
                  className="w-full py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors text-[15px]"
                >
                  Tip Again
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
