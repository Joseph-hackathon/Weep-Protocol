"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FlowchartSection() {
  const [activeTab, setActiveTab] = useState<"merchant" | "employee" | "customer">("merchant");

  return (
    <section id="architecture" className="py-24 px-6 border-t border-white/5 bg-[#050505] relative overflow-hidden">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
      
      <div className="max-w-[1000px] mx-auto relative z-10">
        <div className="mb-12">
          <div className="flex items-center gap-4 text-[#6E54FF] text-sm font-mono tracking-widest uppercase mb-4">
            <span>01</span>
            <div className="h-px w-12 bg-[#6E54FF]/50"></div>
            <span>The Workflow</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-white mb-8">
            Where the tip goes <br/>
            is determined by AI.
          </h2>

          {/* Tabs */}
          <div className="flex items-center gap-2 bg-white/5 p-1.5 rounded-xl border border-white/10 w-fit">
            <button
              onClick={() => setActiveTab("merchant")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "merchant" ? "bg-[#6E54FF] text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              Merchant Flow
            </button>
            <button
              onClick={() => setActiveTab("employee")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "employee" ? "bg-[#6E54FF] text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              Employee Flow
            </button>
            <button
              onClick={() => setActiveTab("customer")}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "customer" ? "bg-[#6E54FF] text-white shadow-lg" : "text-white/60 hover:text-white hover:bg-white/5"}`}
            >
              Customer Flow
            </button>
          </div>
        </div>

        {/* Diagram Container */}
        <div className="p-8 md:p-16 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm relative font-mono overflow-x-auto min-h-[500px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            
            {activeTab === "merchant" && (
              <motion.div key="merchant" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="min-w-[700px] flex flex-col items-center">
                
                {/* Level 1: Merchant */}
                <motion.div 
                  initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }}
                  className="bg-[#6E54FF]/10 border border-[#6E54FF] text-[#6E54FF] px-6 py-4 rounded-lg text-center shadow-[0_0_20px_rgba(110,84,255,0.15)] relative z-10"
                >
                  <div className="font-semibold text-lg mb-1">Merchant Policy Input</div>
                  <div className="text-sm opacity-80 font-sans">"60% to servers, 30% to kitchen..."</div>
                </motion.div>

                {/* Connecting Line 1 */}
                <div className="w-px h-12 bg-white/10 relative overflow-hidden">
                  <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6E54FF] to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                </div>

                {/* Level 2: Chainlink CRE */}
                <motion.div 
                  initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-[#0a0a0a] border border-white/20 text-white px-6 py-4 rounded-lg text-center relative z-10 w-[300px]"
                >
                  <div className="font-semibold text-lg mb-1">Chainlink CRE</div>
                  <div className="text-xs text-white/50 mb-2">Decentralized Oracle Network</div>
                  <div className="bg-black/50 text-white/80 py-1.5 px-3 rounded text-xs border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">Gemini 1.5 JSON Parser</div>
                </motion.div>

                {/* Connecting Line 2 (Split) */}
                <div className="flex flex-col items-center w-full max-w-[650px] relative">
                  <div className="w-px h-8 bg-white/10 relative overflow-hidden">
                    <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6E54FF] to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.5 }} />
                  </div>
                  <div className="w-[85%] h-px bg-white/10 relative overflow-hidden">
                    <motion.div className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-[#6E54FF] to-transparent" animate={{ x: ["-100%", "300%"] }} transition={{ duration: 2, repeat: Infinity, ease: "linear", delay: 0.8 }} />
                  </div>
                </div>

                {/* Level 3: Workers */}
                <div className="flex justify-between gap-6 w-full max-w-[750px] relative">
                  <div className="absolute top-0 left-[7%] w-px h-8 bg-white/10 overflow-hidden">
                    <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6E54FF] to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1 }} />
                  </div>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-8 bg-white/10 overflow-hidden">
                    <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6E54FF] to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1.2 }} />
                  </div>
                  <div className="absolute top-0 right-[7%] w-px h-8 bg-white/10 overflow-hidden">
                    <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#6E54FF] to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 1.4 }} />
                  </div>

                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="bg-[#0a0a0a] border border-white/20 text-white px-5 py-4 rounded-lg text-center flex-1 relative z-10 mt-8">
                    <div className="font-semibold text-white mb-1">FOH Workers</div>
                    <div className="text-sm text-white/60 mb-3">Servers & Hosts</div>
                    <div className="text-xs text-green-400 font-bold bg-green-400/10 py-1.5 rounded border border-green-400/20">60% of Tip Pool</div>
                  </motion.div>
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.5 }} className="bg-[#0a0a0a] border border-white/20 text-white px-5 py-4 rounded-lg text-center flex-1 relative z-10 mt-8">
                    <div className="font-semibold text-white mb-1">BOH Workers</div>
                    <div className="text-sm text-white/60 mb-3">Kitchen Staff</div>
                    <div className="text-xs text-green-400 font-bold bg-green-400/10 py-1.5 rounded border border-green-400/20">30% of Tip Pool</div>
                  </motion.div>
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.6 }} className="bg-[#0a0a0a] border border-white/20 text-white px-5 py-4 rounded-lg text-center flex-1 relative z-10 mt-8">
                    <div className="font-semibold text-white mb-1">BAR Workers</div>
                    <div className="text-sm text-white/60 mb-3">Bartenders</div>
                    <div className="text-xs text-green-400 font-bold bg-green-400/10 py-1.5 rounded border border-green-400/20">10% of Tip Pool</div>
                  </motion.div>
                </div>

                <div className="absolute bottom-[40px] left-[20%] right-[20%] h-[70px] border-b border-dashed border-[#6E54FF]/50 rounded-b-[100px] flex items-end justify-center pb-2 pointer-events-none z-0">
                  <span className="text-[#6E54FF] text-xs font-mono translate-y-6 bg-[#0a0a0a] border border-[#6E54FF]/30 px-4 py-1.5 rounded-full shadow-[0_0_15px_rgba(110,84,255,0.2)]">Securely Settled on Monad Testnet</span>
                </div>
              </motion.div>
            )}

            {activeTab === "employee" && (
              <motion.div key="employee" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="min-w-[400px] flex flex-col items-center">
                <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="bg-blue-500/10 border border-blue-500 text-blue-400 px-6 py-4 rounded-lg text-center shadow-[0_0_20px_rgba(59,130,246,0.15)] relative z-10 w-[300px]">
                  <div className="font-semibold text-lg mb-1">Employee Dashboard</div>
                  <div className="text-sm opacity-80 font-sans">Secure Login via Privy</div>
                </motion.div>

                <div className="w-px h-16 bg-white/10 relative overflow-hidden">
                  <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500 to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                </div>

                <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-[#0a0a0a] border border-white/20 text-white px-6 py-4 rounded-lg text-center relative z-10 w-[300px]">
                  <div className="font-semibold text-lg mb-1">TipSplitter.sol</div>
                  <div className="text-xs text-white/50 mb-2">Smart Contract on Monad</div>
                  <div className="bg-black/50 text-white/80 py-1.5 px-3 rounded text-xs border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">"Push" Based Payroll</div>
                </motion.div>

                <div className="w-px h-16 bg-white/10 relative overflow-hidden">
                  <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500 to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.4 }} />
                </div>

                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="bg-[#0a0a0a] border border-white/20 text-white px-5 py-4 rounded-lg text-center relative z-10 w-[300px]">
                  <div className="font-semibold text-white mb-1">Wallet Balance (AUSD)</div>
                  <div className="text-sm text-white/60 mb-3">Zero Gas Fees to Claim</div>
                  <div className="text-xs text-blue-400 font-bold bg-blue-400/10 py-1.5 rounded border border-blue-400/20">Auto-Distributed</div>
                </motion.div>
              </motion.div>
            )}

            {activeTab === "customer" && (
              <motion.div key="customer" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }} className="min-w-[400px] flex flex-col items-center">
                <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8 }} className="bg-pink-500/10 border border-pink-500 text-pink-400 px-6 py-4 rounded-lg text-center shadow-[0_0_20px_rgba(236,72,153,0.15)] relative z-10 w-[300px]">
                  <div className="font-semibold text-lg mb-1">Customer Terminal</div>
                  <div className="text-sm opacity-80 font-sans">Card / USDC Payment</div>
                </motion.div>

                <div className="w-px h-16 bg-white/10 relative overflow-hidden">
                  <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500 to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }} />
                </div>

                <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="bg-[#0a0a0a] border border-white/20 text-white px-6 py-4 rounded-lg text-center relative z-10 w-[300px]">
                  <div className="font-semibold text-lg mb-1">Monad Tip Pool</div>
                  <div className="text-xs text-white/50 mb-2">Liquidity Aggregation</div>
                  <div className="bg-black/50 text-white/80 py-1.5 px-3 rounded text-xs border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">AUSD Stablecoin</div>
                </motion.div>

                <div className="w-px h-16 bg-white/10 relative overflow-hidden">
                  <motion.div className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500 to-transparent" animate={{ y: ["-100%", "200%"] }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: 0.4 }} />
                </div>

                <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.4 }} className="bg-[#0a0a0a] border border-white/20 text-white px-5 py-4 rounded-lg text-center relative z-10 w-[300px]">
                  <div className="font-semibold text-white mb-1">Awaiting Execution</div>
                  <div className="text-sm text-white/60 mb-3">Merchant Policy Trigger</div>
                  <div className="text-xs text-pink-400 font-bold bg-pink-400/10 py-1.5 rounded border border-pink-400/20">Pending Oracle Sync</div>
                </motion.div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
        
        {/* Legend */}
        <div className="mt-12 pt-6 border-t border-white/10 flex justify-end gap-8 text-xs text-white/40">
          <div className="flex items-center gap-2"><div className="w-4 h-px bg-white/40"></div> Execution Path</div>
          {activeTab === "merchant" && <div className="flex items-center gap-2"><div className="w-4 h-px bg-[#6E54FF]/50 border-t border-dashed"></div> On-Chain Settlement</div>}
        </div>
      </div>
    </section>
  );
}
