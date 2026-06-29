"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, RotateCcw, Home, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Application error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-16 relative">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-destructive/10 blur-[100px]" />
      </div>

      <div className="w-full max-w-xl glass border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
        {/* Warning Icon */}
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-2 glow-sm animate-pulse">
          <AlertOctagon className="h-8 w-8" />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Something went wrong</h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            An unexpected client-side error occurred. This is sometimes caused by Web3 browser extensions (such as MetaMask or WalletConnect) or issues during hydration.
          </p>
        </div>

        {/* Collapsible details */}
        <div className="text-left bg-black/40 border border-white/[0.04] rounded-2xl overflow-hidden transition-all duration-300">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-between hover:bg-white/[0.02] transition-colors"
          >
            <span>Error Diagnostics</span>
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showDetails && (
            <div className="p-4 border-t border-white/[0.04] max-h-48 overflow-y-auto font-mono text-[11px] text-red-400 bg-red-950/20 whitespace-pre-wrap">
              {error.message || "Unknown Error"}
              {error.stack && (
                <div className="mt-2 text-muted-foreground border-t border-white/[0.04] pt-2">
                  {error.stack}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            Try Re-rendering
          </button>
          
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl glass border border-white/10 text-foreground font-semibold text-sm hover:bg-white/[0.07] transition-all"
          >
            <Home className="h-4 w-4" />
            Go back Home
          </Link>
        </div>
      </div>
    </div>
  );
}
