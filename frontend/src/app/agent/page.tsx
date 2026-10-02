"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Terminal, Activity, Server } from "lucide-react";

export default function AgentPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch('/api/logs');
        const data = await res.json();
        setLogs(data);
      } catch (e) {
        console.error(e);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary font-sans flex flex-col">
      <header className="sticky top-0 z-40 w-full border-b border-line bg-bg-primary/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center px-4 sm:px-6">
          <Link href="/" className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-line-strong bg-bg-secondary text-text-primary transition-colors hover:bg-bg-tertiary">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="ml-4 font-semibold flex items-center gap-2">
            <Terminal className="w-5 h-5 text-accent-primary" />
            AI Settlement Agent
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">System Logs</h1>
            <p className="text-sm text-text-secondary mt-1">Real-time monitoring of AI Agent and Canton Node interactions.</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-green-500/10 text-green-400 border border-green-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              AI Agent Active
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              <Server className="w-3 h-3" />
              Canton JSON API (7575)
            </div>
          </div>
        </div>

        <div className="flex-1 bg-well border border-line rounded-xl p-4 font-mono text-sm overflow-hidden flex flex-col min-h-[500px] shadow-inner relative">
          <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-well to-transparent z-10 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto space-y-2 py-2 scrollbar-thin scrollbar-thumb-line scrollbar-track-transparent">
            {logs.length === 0 && (
              <div className="text-text-tertiary italic">Waiting for events...</div>
            )}
            {logs.map((log, i) => {
              let colorClass = "text-text-secondary";
              if (log.includes("[SUCCESS]")) colorClass = "text-green-400";
              else if (log.includes("[ERROR]") || log.includes("[CANTON-ERROR]")) colorClass = "text-red-400";
              else if (log.includes("[EVENT]")) colorClass = "text-accent-primary";
              else if (log.includes("[PROCESS]") || log.includes("[CALCULATE]")) colorClass = "text-yellow-400";
              else if (log.includes("[CANTON]")) colorClass = "text-purple-400";
              
              return (
                <div key={i} className="leading-relaxed border-b border-white/5 pb-2 last:border-0 hover:bg-white/5 px-2 -mx-2 rounded transition-colors">
                  <span className="text-text-tertiary mr-3 text-xs">
                    {new Date().toISOString().split('T')[1].substring(0,8)}
                  </span>
                  <span className={colorClass}>{log}</span>
                </div>
              );
            })}
            <div ref={logsEndRef} />
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t from-well to-transparent z-10 pointer-events-none" />
        </div>
      </main>
    </div>
  );
}
