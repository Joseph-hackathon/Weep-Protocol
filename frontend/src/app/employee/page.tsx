"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Wallet, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useReadContract } from 'wagmi';
import { formatUnits } from 'viem';

const AUSD_ADDRESS = "0xcEF38D455529Dbc2e37654452C288C25e18ADea4";

export default function EmployeePage() {
  const [showBalance, setShowBalance] = useState(true);
  
  const { login, authenticated, logout } = usePrivy();
  const { wallets } = useWallets();
  const activeWallet = wallets[0];

  const { data: balance } = useReadContract({
    address: AUSD_ADDRESS as `0x${string}`,
    abi: [{"name": "balanceOf", "type": "function", "stateMutability": "view", "inputs": [{"name": "account", "type": "address"}], "outputs": [{"name": "", "type": "uint256"}]}],
    functionName: 'balanceOf',
    args: [activeWallet?.address as `0x${string}`],
    query: {
      enabled: !!activeWallet?.address,
      refetchInterval: 3000,
    }
  });

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-[15px] font-medium">Back to Home</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5 text-[13px] font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
              Monad Testnet
            </div>
            {authenticated && activeWallet ? (
              <button 
                onClick={logout}
                className="px-4 py-2 bg-white/10 hover:bg-white/15 transition-colors rounded-xl text-sm font-medium border border-white/10 flex items-center gap-2 cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-[#6E54FF]"></div>
                {activeWallet.address.slice(0, 6)}...{activeWallet.address.slice(-4)}
              </button>
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
      </header>

      <main className="flex-1 mx-auto w-full max-w-3xl px-6 py-16">
        {!authenticated || !activeWallet ? (
          <div className="flex flex-col items-center justify-center h-64 text-center mt-12">
            <div className="p-6 bg-white/5 rounded-full mb-6">
              <Wallet className="w-10 h-10 text-white/40" />
            </div>
            <h2 className="text-2xl font-medium text-white mb-3">Employee Dashboard</h2>
            <p className="text-white/50 text-[15px] mb-8 max-w-md leading-relaxed">
              Connect your wallet to check the AUSD tips that have been securely deposited into your account via TipSplitter.
            </p>
            <button
              onClick={login}
              className="px-8 py-3.5 bg-[#6E54FF] hover:bg-[#5b45db] transition-colors rounded-xl font-medium text-[15px]"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Balance Card */}
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] p-8 md:p-10 mb-8 relative shadow-2xl overflow-hidden mt-6">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <div className="text-white/50 text-[15px] font-medium mb-2">My Current Balance</div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-5xl font-medium tracking-tight">
                      {showBalance ? (balance !== undefined ? formatUnits(balance as bigint, 18) : "0.00") : "****"} <span className="text-2xl text-white/40">AUSD</span>
                    </h1>
                    <button 
                      onClick={() => setShowBalance(!showBalance)}
                      className="text-white/40 hover:text-white transition-colors p-2"
                    >
                      {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
                  <ShieldCheck className="w-4 h-4" /> Monad Secure
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="h-10 rounded-xl bg-[#6E54FF]/10 text-[#6E54FF] border border-[#6E54FF]/20 flex items-center justify-center px-4 font-medium text-sm">
                  Web3 Payroll Active
                </div>
                <p className="text-white/40 text-sm font-medium">
                  Tips are automatically pushed directly to your wallet by the smart contract. No gas fees or claiming required!
                </p>
              </div>
            </div>

            {/* Transactions Placeholder */}
            <div>
              <h2 className="text-xl font-medium tracking-tight mb-4 px-2">On-Chain History</h2>
              <div className="bg-[#0a0a0a] border border-white/5 rounded-3xl p-12 text-center shadow-2xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mx-auto mb-4"></div>
                <p className="text-white/50 text-[15px] font-medium">Transaction indexer syncing with Monad Testnet...</p>
                <p className="text-white/30 text-sm mt-2">Your historical tip payouts will appear here shortly.</p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
