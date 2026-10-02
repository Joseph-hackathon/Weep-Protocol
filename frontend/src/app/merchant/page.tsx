"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send, Activity, Shield, ShieldAlert, CheckCircle2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { createWalletClient, custom } from 'viem';
import { monadTestnet } from 'viem/chains';

const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";
const TIP_SPLITTER_ADDRESS = "0x1A245Dc83F286CA5A6833626E813776623f9F336";

export default function MerchantPage() {
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [newWorkerAddress, setNewWorkerAddress] = useState("");
  const [nansenScore, setNansenScore] = useState<number | null>(null);
  const [nansenLabels, setNansenLabels] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [appliedRoles, setAppliedRoles] = useState<{FOH: number, BOH: number, BAR: number} | null>(null);

  const { wallets } = useWallets();
  const activeWallet = wallets[0];
  const { login, logout, authenticated } = usePrivy();

  const { data: poolBalance } = useReadContract({
    address: AUSD_ADDRESS as `0x${string}`,
    abi: [{"name": "balanceOf", "type": "function", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]}],
    functionName: 'balanceOf',
    args: [TIP_SPLITTER_ADDRESS as `0x${string}`],
    query: {
      refetchInterval: 3000,
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input) return;
    if (!authenticated || !activeWallet) {
      alert("Please connect your wallet first using the 'Connect Wallet' button in the top right.");
      return;
    }
    setIsProcessing(true);

    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }), // FIX: matched the backend 'text' property
      });
      const data = await res.json();
      
      console.log("Parsed Policy Ratios:", data);

      await activeWallet.switchChain(monadTestnet.id);
      const provider = await activeWallet.getEthereumProvider();
      const walletClient = createWalletClient({
        account: activeWallet.address as `0x${string}`,
        chain: monadTestnet,
        transport: custom(provider)
      });

      const hash = await walletClient.writeContract({
        address: TIP_SPLITTER_ADDRESS as `0x${string}`,
        abi: [{"name": "updatePolicy", "type": "function", "stateMutability": "nonpayable", "inputs": [{"name": "_foh", "type": "uint256"}, {"name": "_boh", "type": "uint256"}, {"name": "_bar", "type": "uint256"}]}],
        functionName: 'updatePolicy',
        // FIX: Extracting from data.roles
        args: [BigInt(data.roles?.FOH ?? 50), BigInt(data.roles?.BOH ?? 30), BigInt(data.roles?.BAR ?? 20)],
      });
      
      setTxHash(hash);
      setAppliedRoles(data.roles);
      setInput("");

    } catch (error) {
      console.error(error);
      alert("Failed to update policy. Ensure you have Monad gas.");
    }
    setIsProcessing(false);
  };

  const handleNansenCheck = async () => {
    if (!newWorkerAddress) return;
    setIsProcessing(true);
    setNansenLabels([]);
    setNansenScore(null);
    try {
      const res = await fetch('/api/nansen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: newWorkerAddress })
      });
      const data = await res.json();
      
      let finalLabels = [];
      if (data.labels && Array.isArray(data.labels)) {
         finalLabels = data.labels.slice(0, 5); // show up to 5 labels
         setNansenLabels(finalLabels);
      } else if (data.labels) {
         finalLabels = Object.keys(data.labels || {}).slice(0, 5); // sometimes it's an object depending on API format
         setNansenLabels(finalLabels);
      }
      
      // Calculate a rough risk score based on labels or fallback to clean if no bad labels
      let score = 10;
      if (finalLabels.length > 0) {
        const badKeywords = ['bot', 'scam', 'hacker', 'phish', 'exploit', 'sandwich', 'mev', 'risk'];
        const hasBad = finalLabels.some((l: string) => badKeywords.some(bk => l.toLowerCase().includes(bk)));
        if (hasBad) score = 95;
      }
      setNansenScore(data.score || score);
    } catch (error) {
      console.error("Nansen API Error:", error);
    }
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col selection:bg-[#6E54FF] selection:text-white">
      
      {/* Ultra Clean Header */}
      <nav className="w-full border-b border-white/5 bg-black/80 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[15px] font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[13px] font-medium items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Monad Testnet
            </div>
            
            {authenticated && activeWallet ? (
              <div className="relative">
                <button 
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 transition-colors rounded-xl text-sm font-medium border border-white/10 flex items-center gap-2 cursor-pointer"
                >
                  <div className="w-2 h-2 rounded-full bg-[#6E54FF]"></div>
                  {activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}
                </button>
                
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        alert("Transaction History coming soon!");
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-white/80 hover:bg-white/5 hover:text-white transition-colors border-b border-white/5"
                    >
                      History
                    </button>
                    <button 
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={login}
                className="px-4 py-2 bg-white text-black hover:bg-white/90 transition-colors rounded-xl text-sm font-medium"
              >
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: AI Policy */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Smart Contract Pool Stats */}
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] p-8 md:p-10 relative overflow-hidden flex flex-col sm:flex-row items-center justify-between shadow-2xl">
            <div>
              <h3 className="text-white/40 text-sm font-medium mb-1">Total Unclaimed Tip Pool</h3>
              <div className="text-4xl md:text-5xl font-medium text-white mb-2">
                {poolBalance !== undefined ? formatUnits(poolBalance as bigint, 18) : "0.00"} <span className="text-2xl text-white/40">AUSD</span>
              </div>
              <p className="text-sm text-[#6E54FF] font-medium flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Held securely in TipSplitter.sol
              </p>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] p-8 md:p-10 relative shadow-2xl">
            <div className="flex items-start gap-4 mb-8">
              <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center">
                <img src="/chainlink-hexagon.png" className="w-7 h-7 object-contain mix-blend-screen" alt="Chainlink" />
              </div>
              <div>
                <h2 className="text-2xl font-medium tracking-tight mb-2">AI Smart Policies</h2>
                <p className="text-white/50 text-[15px] font-medium leading-relaxed max-w-xl">
                  Type your distribution rules naturally. Weep's LLM engine parses your text into precise ratios and deploys them trustlessly via Chainlink CRE on Monad.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="e.g., 'Today is extremely busy for the servers. Let's give 60% to front of house, 30% to kitchen, and 10% to the bar.'"
                className="w-full bg-black border border-white/5 rounded-2xl p-6 min-h-[180px] text-white placeholder:text-white/30 focus:outline-none focus:border-[#6E54FF] transition-colors resize-none font-medium text-[15px]"
              />
              <button
                type="submit"
                disabled={!input || isProcessing}
                className="absolute bottom-4 right-4 px-6 py-3 bg-[#6E54FF] text-white rounded-xl font-medium text-[15px] flex items-center gap-2 hover:bg-[#5b45db] transition-colors disabled:opacity-50"
              >
                {isProcessing ? "Processing via CRE..." : "Update Policy"}
                <Send className="w-4 h-4" />
              </button>
            </form>
            
            <AnimatePresence>
              {txHash && appliedRoles && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 p-6 bg-[#6E54FF]/10 border border-[#6E54FF]/20 rounded-2xl flex flex-col gap-4 overflow-hidden"
                >
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3 text-left">
                      <CheckCircle2 className="w-6 h-6 text-[#6E54FF] shrink-0" />
                      <div>
                        <h3 className="text-white font-medium text-[15px]">Policy Deployed Successfully</h3>
                        <p className="text-white/50 text-sm">Ratios have been securely executed on Monad Testnet.</p>
                      </div>
                    </div>
                    <a 
                      href={`https://testnet.monadexplorer.com/tx/${txHash}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-4 py-2 shrink-0 bg-white/5 border border-white/10 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors"
                    >
                      View Explorer ↗
                    </a>
                  </div>

                  <div className="mt-2 p-4 bg-black/40 rounded-xl border border-white/5 grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-white/40 text-xs font-medium mb-1">FRONT OF HOUSE</div>
                      <div className="text-xl font-semibold text-white">{appliedRoles.FOH}%</div>
                    </div>
                    <div className="border-x border-white/5">
                      <div className="text-white/40 text-xs font-medium mb-1">BACK OF HOUSE</div>
                      <div className="text-xl font-semibold text-white">{appliedRoles.BOH}%</div>
                    </div>
                    <div>
                      <div className="text-white/40 text-xs font-medium mb-1">BAR</div>
                      <div className="text-xl font-semibold text-white">{appliedRoles.BAR}%</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Nansen Smart KYC */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] p-8 md:p-10 shadow-2xl h-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 flex items-center justify-center">
                <img src="/nansen-logo.png" alt="Nansen Logo" className="w-5 h-5 object-contain" />
              </div>
              <h3 className="font-medium text-xl">Nansen KYC</h3>
            </div>
            <p className="text-[14px] text-white/50 mb-8 font-medium leading-relaxed">
              Verify new employee wallet addresses against Nansen's on-chain database to prevent Sybil attacks or honeypots before adding them to payroll.
            </p>

            <div className="space-y-4 mt-auto">
              <input
                type="text"
                placeholder="0x..."
                value={newWorkerAddress}
                onChange={(e) => setNewWorkerAddress(e.target.value)}
                className="w-full bg-black border border-white/5 rounded-xl px-4 py-4 text-[14px] font-medium text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
              <button
                onClick={handleNansenCheck}
                disabled={!newWorkerAddress || isProcessing}
                className="w-full py-4 bg-white/5 text-white border border-white/5 rounded-xl font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2 text-[15px]"
              >
                {isProcessing ? "Scanning via Nansen..." : "Check Risk Score"}
              </button>

              <AnimatePresence>
                {nansenScore !== null && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="pt-4"
                  >
                    <div className={`p-4 rounded-xl border flex flex-col gap-3 ${nansenScore > 80 ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-green-500/10 border-green-500/20 text-green-400'}`}>
                      <div className="flex items-start gap-3">
                        {nansenScore > 80 ? <ShieldAlert className="w-5 h-5 shrink-0" /> : <CheckCircle2 className="w-5 h-5 shrink-0" />}
                        <div>
                          <div className="font-medium mb-1 text-[14px]">Risk Score: {nansenScore}/100</div>
                          <p className="text-[12px] opacity-80 font-medium leading-relaxed">
                            {nansenScore > 80 
                              ? "Warning: Flagged by Nansen as high risk." 
                              : "Address is clean. No suspicious activity found."}
                          </p>
                        </div>
                      </div>
                      
                      {nansenLabels.length > 0 && (
                        <div className="mt-2 pt-3 border-t border-current/10">
                          <p className="text-[11px] mb-2 opacity-70">On-chain Labels:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {nansenLabels.map((label, idx) => (
                              <span key={idx} className="px-2 py-1 bg-black/40 rounded-md text-[10px] whitespace-nowrap font-medium">
                                {label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
