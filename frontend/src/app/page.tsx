"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Terminal, CheckCircle2, XCircle, Zap, ShieldCheck, BrainCircuit, Globe, Lock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import FlowchartSection from "./FlowchartSection";

export default function Home() {
  const [terminalText, setTerminalText] = useState<string[]>([]);
  const terminalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [terminalText]);

  useEffect(() => {
    const lines = [
      "$ weep parse-policy \"Give 60% to FOH\"",
      "Policy compiled to WASM.",
      "Deploying to Chainlink CRE on Monad...",
      "AI Workflow active. Awaiting payments.",
      "$ weep tip-received 50 AUSD",
      "Nansen Smart KYC checking wallets...",
      "Splitting funds via TipSplitter.sol...",
      "30 AUSD routed to Front of House via Privy.",
      "20 AUSD routed to Kitchen via Privy.",
      "Cross-border settlement complete in 0.8s."
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < lines.length) {
        setTerminalText(prev => [...prev, lines[i]]);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let img = new Image();
    img.src = '/logo.png';
    let frame = 0;
    
    const start = () => {
      const resize = () => {
        const parent = canvas.parentElement;
        if (parent) {
          canvas.width = parent.clientWidth || window.innerWidth;
          canvas.height = parent.clientHeight || 500;
        }
      };
      window.addEventListener('resize', resize);
      resize(); // initial size setup

      const render = () => {
        frame++;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Resolution for the pixel matrix
        const pixelSize = 10;
        const cols = Math.floor(canvas.width / pixelSize);
        const rows = Math.floor(canvas.height / pixelSize);
        
        if (cols <= 0 || rows <= 0) {
           requestAnimationFrame(render);
           return;
        }
        
        // Use an offscreen canvas to sample the logo at low resolution
        const offCanvas = document.createElement('canvas');
        offCanvas.width = cols;
        offCanvas.height = rows;
        const offCtx = offCanvas.getContext('2d');
        if (!offCtx) return;

        // Draw logo centered
        const imgSize = Math.min(cols, rows) * 0.7; 
        const ix = (cols - imgSize) / 2;
        const iy = (rows - imgSize) / 2 + Math.sin(frame * 0.03) * 2;
        
        offCtx.drawImage(img, ix, iy, imgSize, imgSize);
        const imgData = offCtx.getImageData(0, 0, cols, rows).data;

        const bayer = [
          [ 0,  8,  2, 10],
          [12,  4, 14,  6],
          [ 3, 11,  1,  9],
          [15,  7, 13,  5]
        ];

        ctx.fillStyle = '#6E54FF';
        
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const alpha = imgData[i + 3];
            
            // Fallback intensity if logo is just solid alpha mask
            let intensity = alpha; 
            
            // If the logo has colors, adjust intensity based on brightness
            const brightness = (r + g + b) / 3;
            if (brightness > 0) {
               intensity = (brightness * (alpha / 255));
            }
            
            if (intensity > 20) {
              const wave = Math.sin((x * 0.15) + (y * 0.15) - (frame * 0.05)) * 60;
              const threshold = (bayer[y % 4][x % 4] / 16) * 255;
              
              // Draw if intensity + wave passes threshold OR if intensity is very high
              if (intensity + wave > threshold || intensity > 200) {
                ctx.globalAlpha = 0.4 + (Math.sin(frame * 0.1 + x) * 0.4);
                ctx.fillRect(x * pixelSize + 1, y * pixelSize + 1, pixelSize - 2, pixelSize - 2);
              }
            }
          }
        }
        requestAnimationFrame(render);
      };
      render();
    };

    if (img.complete) {
      start();
    } else {
      img.onload = start;
    }
  }, []);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-[#6E54FF] selection:text-white overflow-x-hidden">
      
      {/* Navbar - Ultra Clean */}
      <nav className="fixed top-0 z-50 w-full bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.png" className="w-10 h-10 rounded-lg mix-blend-screen" alt="Weep Logo" />
            <span className="text-xl font-medium tracking-tight">Weep</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-white/60">
            <Link href="#problem" className="hover:text-white transition-colors">The Problem</Link>
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
          </div>
          <div className="flex items-center gap-6">
            <Link 
              href="/merchant" 
              className="hidden md:flex text-[15px] font-medium text-white/60 hover:text-white transition-colors"
            >
              Merchant
            </Link>
            <Link 
              href="/employee" 
              className="hidden md:flex text-[15px] font-medium text-white/60 hover:text-white transition-colors"
            >
              Employee
            </Link>
            <Link 
              href="/customer" 
              className="bg-white hover:bg-white/90 text-black font-medium px-5 py-2 rounded-full transition-all flex items-center gap-2 text-[15px]"
            >
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section - Minimal Centered with Canvas Background */}
      <section className="relative pt-40 pb-20 px-6 max-w-[1200px] mx-auto flex flex-col items-center text-center">
        
        {/* Animated Canvas Background */}
        <div className="absolute inset-0 -z-10 flex items-center justify-center opacity-80 pointer-events-none mix-blend-screen overflow-hidden">
          <canvas ref={canvasRef} aria-hidden="true" className="w-full h-full max-w-4xl mx-auto"></canvas>
          <span className="sr-only">Logo rendered as an animated ordered dither</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-4xl flex flex-col items-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#6E54FF]/20 bg-[#6E54FF]/10 text-[#6E54FF] text-[13px] font-medium mb-8 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6E54FF]"></span>
            Tipping as an Infrastructure Layer
          </div>
          <h1 className="text-6xl md:text-[88px] font-medium tracking-tighter leading-[1.05] mb-6">
            Restore trust. <br />
            Automate fairness.
          </h1>
          <p className="text-xl text-white/60 mb-10 max-w-2xl leading-relaxed font-medium">
            Tipping has evolved, but the infrastructure hasn't. Weep transforms opaque, manual tip pooling into a transparent, frictionless on-chain engine powered by AI and Monad.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4">
            <Link href="/merchant" className="bg-[#6E54FF] hover:bg-[#5b45db] text-white font-medium px-8 py-4 rounded-full transition-all flex items-center gap-2 text-[17px]">
              Merchant Portal
            </Link>
            <Link href="/employee" className="bg-white/10 hover:bg-white/15 text-white font-medium px-8 py-4 rounded-full transition-all text-[17px] backdrop-blur-md border border-white/5">
              Employee Dashboard
            </Link>
            <Link href="/customer" className="bg-white/10 hover:bg-white/15 text-white font-medium px-8 py-4 rounded-full transition-all text-[17px] backdrop-blur-md border border-white/5">
              Customer Demo
            </Link>
          </div>
        </motion.div>
      </section>

      <FlowchartSection />

      {/* Logo Cloud - Trail Animation */}
      <section className="py-12 border-y border-white/5 overflow-hidden flex flex-col items-center">
        <p className="text-[13px] font-medium text-white/40 uppercase tracking-widest mb-10 z-10">Powered by the best in Web3</p>
        <div 
          className="w-full relative flex overflow-hidden" 
          style={{ maskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, black 15%, black 85%, transparent)' }}
        >
          <div className="flex w-max animate-marquee hover:[animation-play-state:paused] gap-12 md:gap-20 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
            {/* We duplicate the logos array 3 times to ensure a seamless infinite scroll loop */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-12 md:gap-20 shrink-0">
                <img src="/monad-logo.png" className="h-7 invert" alt="Monad" />
                <img src="/agora-logo.png" className="h-7" alt="Agora" />
                <img src="/chainlink-logo.png" className="h-7 invert" alt="Chainlink" />
                <img src="/privy-logo.png" className="h-7" alt="Privy" />
                <img src="/nansen-logo.png" className="h-10 invert" alt="Nansen" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem & Solution Section - Clean Cards */}
      <section id="problem" className="py-32 px-6 max-w-[1200px] mx-auto">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">Structural problems in tipping.</h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium">Digital tipping is broken by trust deficits and fragmented infrastructure.</p>
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Problem */}
          <div className="bg-[#0a0a0a] rounded-[32px] border border-white/5 p-12 flex flex-col gap-6">
            <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/50">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-medium">The Market Failure</h3>
            <p className="text-white/50 text-lg leading-relaxed font-medium">
              Consumers increasingly doubt if tips actually reach workers, reducing participation. Meanwhile, workers suffer from opaque, manager-controlled distribution. Businesses face high integration costs and compliance risks across different jurisdictions.
            </p>
            <div className="space-y-4 mt-auto pt-8">
              <div className="flex items-center gap-4 font-medium text-white/70"><XCircle className="w-5 h-5 text-white/30" /> Trust deficit & opaque distribution</div>
              <div className="flex items-center gap-4 font-medium text-white/70"><XCircle className="w-5 h-5 text-white/30" /> High UX friction causes drop-offs</div>
              <div className="flex items-center gap-4 font-medium text-white/70"><XCircle className="w-5 h-5 text-white/30" /> Legal & compliance complexity</div>
            </div>
          </div>

          {/* Solution */}
          <div className="bg-[#6E54FF] rounded-[32px] p-12 flex flex-col gap-6">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-white">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-3xl font-medium text-white">The Weep Infrastructure</h3>
            <p className="text-white/80 text-lg leading-relaxed font-medium">
              Weep elevates tipping from a simple POS button into a verifiable infrastructure. By combining AI context-awareness with transparent on-chain distribution, we restore trust for consumers and workers while removing friction.
            </p>
            <div className="space-y-4 mt-auto pt-8">
              <div className="flex items-center gap-4 font-medium text-white"><CheckCircle2 className="w-5 h-5 text-white/70" /> 100% Trackable On-chain Distribution</div>
              <div className="flex items-center gap-4 font-medium text-white"><CheckCircle2 className="w-5 h-5 text-white/70" /> AI-Parsed Smart Policies (Chainlink CRE)</div>
              <div className="flex items-center gap-4 font-medium text-white"><CheckCircle2 className="w-5 h-5 text-white/70" /> Frictionless Embedded Wallets (Privy)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Clean Layout */}
      <section id="features" className="py-24 px-6 max-w-[1200px] mx-auto border-t border-white/5">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight mb-6">Built for scale and trust.</h2>
          <p className="text-xl text-white/50 max-w-2xl mx-auto font-medium">
            Everything you need to deploy tipping as a strategic data and compensation layer.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-[#0a0a0a] rounded-[32px] border border-white/5 p-10">
            <div className="w-12 h-12 bg-[#6E54FF]/10 rounded-full flex items-center justify-center text-[#6E54FF] mb-8">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-medium mb-4">Transparent On-chain Payouts</h3>
            <p className="text-white/50 leading-relaxed font-medium">
              Eliminate mistrust. Immutable smart contracts instantly distribute Agora AUSD tips directly to employees on the Monad network, providing 100% trackable and verifiable logs.
            </p>
          </div>

          <div className="bg-[#0a0a0a] rounded-[32px] border border-white/5 p-10">
            <div className="w-12 h-12 bg-[#6E54FF]/10 rounded-full flex items-center justify-center text-[#6E54FF] mb-8">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-medium mb-4">AI Smart Policies</h3>
            <p className="text-white/50 leading-relaxed font-medium">
              Merchants type rules in natural language (e.g. "60% to Front of House"). Weep uses LLMs to parse them into smart contract ratios executed securely via Chainlink CRE.
            </p>
          </div>

          <div className="bg-[#0a0a0a] rounded-[32px] border border-white/5 p-10">
            <div className="w-12 h-12 bg-[#6E54FF]/10 rounded-full flex items-center justify-center text-[#6E54FF] mb-8">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-medium mb-4">Frictionless Embedded UX</h3>
            <p className="text-white/50 leading-relaxed font-medium">
              Consumers abandon tips if checkout is hard. Privy embedded wallets enable zero-install, 1-tap tipping without the need for complex seed phrases.
            </p>
          </div>
        </div>
      </section>

      {/* Deep Dives - Minimal */}
      <section id="how-it-works" className="py-32 px-6 max-w-[1200px] mx-auto border-t border-white/5">
        
        {/* Row 1 */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
          <div className="order-2 lg:order-1 bg-[#0a0a0a] rounded-[32px] border border-white/5 p-16 flex flex-col items-center justify-center min-h-[400px]">
            <Globe className="w-16 h-16 text-white/20 mb-8" />
            <div className="text-center">
              <div className="text-2xl font-medium text-white mb-2">Global Reach</div>
              <div className="font-mono text-[13px] text-[#6E54FF]">MONAD &lt;-&gt; AGORA</div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <h3 className="text-4xl font-medium mb-6">Cross-border Settlement via Agora AUSD</h3>
            <p className="text-lg text-white/50 leading-relaxed font-medium">
              Weep utilizes Agora's fully collateralized AUSD stablecoin to instantly settle tips across borders. Instead of relying on centralized payment processors, all payouts are executed directly on the Monad testnet.
            </p>
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h3 className="text-4xl font-medium mb-6">Secure Automation with Chainlink CRE</h3>
            <p className="text-lg text-white/50 leading-relaxed font-medium">
              To automate complex multi-step workflows like dynamic tip splitting and AI verification steps, we integrate the Chainlink Common Runtime Environment (CRE). When a customer pays, decentralized networks trigger payouts reliably.
            </p>
          </div>
          <div className="bg-[#6E54FF] rounded-[32px] p-16 flex flex-col items-center justify-center min-h-[400px]">
            <Lock className="w-16 h-16 text-white/30 mb-8" />
            <div className="text-center">
              <div className="text-2xl font-medium text-white mb-2">Trustless Execution</div>
              <div className="font-mono text-[13px] text-white/60">CHAINLINK DON</div>
            </div>
          </div>
        </div>

      </section>

      {/* CTA Banner - Soft Minimal */}
      <section className="pb-32 px-6 max-w-[1200px] mx-auto">
        <div className="bg-[#0a0a0a] rounded-[32px] border border-white/5 p-16 md:p-24 text-center">
          <h2 className="text-4xl md:text-6xl font-medium text-white mb-6">Ready to automate your payroll?</h2>
          <p className="text-xl text-white/50 mb-12 max-w-2xl mx-auto font-medium">
            Join the next generation of decentralized tipping and workflow automation on Monad.
          </p>
          <Link href="/merchant" className="bg-white text-black hover:bg-white/90 font-medium px-10 py-4 rounded-full transition-all text-[17px] inline-flex items-center gap-2">
            Start Building
          </Link>
        </div>
      </section>

      {/* Footer - Clean */}
      <footer className="border-t border-white/5 py-12 px-6 max-w-[1200px] mx-auto flex flex-col md:flex-row items-center justify-between text-white/40">
        <div className="flex items-center gap-3 mb-6 md:mb-0">
          <img src="/logo.png" className="w-8 h-8 rounded-lg mix-blend-screen" alt="Weep Logo" />
          <span className="font-medium text-lg text-white/60">Weep</span>
        </div>
        <p className="text-[14px] font-medium">© 2026 Weep. Monad Metropolis Hackathon.</p>
      </footer>
    </div>
  );
}
