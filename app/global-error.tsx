"use client";

import { useEffect, useState } from "react";
import { AlertOctagon, RotateCcw, ChevronDown, ChevronUp } from "lucide-react";
import "./globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    console.error("Global Layout crash caught:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased bg-background text-foreground min-h-screen flex items-center justify-center px-4 py-16 relative">
        {/* Background Glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-destructive/8 blur-[120px]" />
        </div>

        <div className="w-full max-w-xl glass border border-white/[0.08] rounded-3xl p-8 shadow-2xl relative z-10 text-center space-y-6">
          {/* Warning Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-2 glow-sm animate-pulse">
            <AlertOctagon className="h-8 w-8" />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">System Initialization Error</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              A critical layout-level error occurred (often related to MetaMask extension connection, provider loading, or system hydration issues).
            </p>
          </div>

          {/* Collapsible details */}
          <div className="text-left bg-black/40 border border-white/[0.04] rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center justify-between hover:bg-white/[0.02] transition-colors cursor-pointer"
            >
              <span>View System Trace</span>
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showDetails && (
              <div className="p-4 border-t border-white/[0.04] max-h-48 overflow-y-auto font-mono text-[11px] text-red-400 bg-red-950/20 whitespace-pre-wrap">
                {error.message || "Unknown Initialization Error"}
                {error.stack && (
                  <div className="mt-2 text-muted-foreground border-t border-white/[0.04] pt-2">
                    {error.stack}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center pt-2">
            <button
              onClick={reset}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-all hover:scale-[1.02] cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              Reset & Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
