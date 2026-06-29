"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, X, CheckCircle2, Loader2, XCircle, Clock } from "lucide-react";
import { useProtocolLog, ProtocolStepStatus } from "@/lib/protocol-log";

// ─── Step indicator dot ───────────────────────────────────────────────────────

function StatusDot({ status }: { status: ProtocolStepStatus }) {
  if (status === "done") {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />;
  }
  if (status === "active") {
    return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />;
  }
  if (status === "error") {
    return <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />;
  }
  return (
    <span className="h-3.5 w-3.5 rounded-full border border-white/20 bg-white/5 shrink-0 inline-block" />
  );
}

function stepColor(status: ProtocolStepStatus): string {
  switch (status) {
    case "done":    return "text-emerald-300";
    case "active":  return "text-primary";
    case "error":   return "text-destructive";
    default:        return "text-muted-foreground";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProtocolDebugPanel() {
  const { steps, isOpen, setOpen, clearSteps } = useProtocolLog();
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest step
  useEffect(() => {
    if (isOpen && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [steps, isOpen]);

  const activeCount = steps.filter((s) => s.status === "active").length;
  const doneCount = steps.filter((s) => s.status === "done").length;
  const hasActivity = steps.length > 0;

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        id="protocol-debug-toggle"
        onClick={() => setOpen(!isOpen)}
        aria-label="Toggle protocol debug panel"
        className={`
          fixed bottom-6 right-6 z-50 hidden md:flex items-center gap-2
          px-3 py-2.5 rounded-xl text-xs font-mono font-semibold
          transition-all duration-200 shadow-2xl
          ${isOpen
            ? "bg-primary text-white glow-sm animate-none"
            : "bg-card border border-white/[0.12] text-muted-foreground hover:text-foreground hover:border-white/25"
          }
        `}
      >
        <Terminal className="h-3.5 w-3.5" />
        <span>Dev Mode</span>
        {hasActivity && !isOpen && (
          <span className={`
            h-5 px-1.5 rounded-full text-[10px] font-bold flex items-center justify-center
            ${activeCount > 0
              ? "bg-primary/20 text-primary animate-pulse"
              : "bg-emerald-400/20 text-emerald-400"
            }
          `}>
            {activeCount > 0 ? activeCount : doneCount}
          </span>
        )}
      </button>

      {/* ── Slide-in Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="debug-panel"
            initial={{ opacity: 0, x: 32, y: 0 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: 32 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="
              fixed bottom-20 right-6 z-50 hidden md:flex flex-col
              w-80 max-h-[520px]
              bg-card border border-white/[0.10] rounded-2xl overflow-hidden shadow-2xl
            "
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.07] bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Terminal className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground font-mono">Protocol Monitor</p>
                  <p className="text-[10px] text-muted-foreground">HFI Pay · Live trace</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {hasActivity && (
                  <button
                    onClick={clearSteps}
                    className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-white/[0.05] transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/[0.05] text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Steps list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 min-h-[80px]">
              {steps.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Clock className="h-6 w-6 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">
                    Waiting for protocol activity…
                  </p>
                  <p className="text-[10px] text-muted-foreground/60">
                    Start a payment to see the live trace
                  </p>
                </div>
              ) : (
                <>
                  <AnimatePresence initial={false}>
                    {steps.map((step, i) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: i * 0.03 }}
                        className={`
                          flex items-start gap-2.5 px-3 py-2.5 rounded-xl
                          transition-colors duration-200
                          ${step.status === "active"
                            ? "bg-primary/8 border border-primary/15"
                            : step.status === "done"
                            ? "bg-emerald-400/5 border border-transparent"
                            : step.status === "error"
                            ? "bg-destructive/8 border border-destructive/15"
                            : "border border-transparent"
                          }
                        `}
                      >
                        <div className="mt-0.5">
                          <StatusDot status={step.status} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium font-mono leading-tight ${stepColor(step.status)}`}>
                            {step.label}
                          </p>
                          {step.detail && (
                            <p className="text-[10px] text-muted-foreground mt-0.5 truncate font-mono">
                              {step.detail}
                            </p>
                          )}
                        </div>
                        {step.timestamp && (
                          <p className="text-[9px] text-muted-foreground/50 shrink-0 font-mono mt-0.5">
                            {step.timestamp}
                          </p>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Footer summary */}
            {hasActivity && (
              <div className="px-4 py-2.5 border-t border-white/[0.06] flex items-center justify-between bg-white/[0.01]">
                <div className="flex items-center gap-3 text-[10px] font-mono">
                  <span className="text-emerald-400">{doneCount} done</span>
                  {activeCount > 0 && (
                    <span className="text-primary animate-pulse">{activeCount} active</span>
                  )}
                  <span className="text-muted-foreground">
                    {steps.filter((s) => s.status === "pending").length} pending
                  </span>
                </div>
                <span className="text-[9px] text-muted-foreground/40 font-mono">relay-hfi-01</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
