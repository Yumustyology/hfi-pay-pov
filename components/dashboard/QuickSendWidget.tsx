"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Loader2, CheckCircle2, XCircle, Send, ArrowRight } from "lucide-react";

interface Props {
  connectedAddress?: string;
  connectedEmail?: string;
}

export default function QuickSendWidget({ connectedAddress, connectedEmail }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selfSendError, setSelfSendError] = useState(false);
  const [recipient, setRecipient] = useState<{
    displayName: string;
    walletAddress: string;
    homeRelay?: string;
  } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedEmail(email), 500);
    return () => clearTimeout(t);
  }, [email]);

  useEffect(() => {
    if (!debouncedEmail || !debouncedEmail.includes("@")) {
      setRecipient(null);
      setSearched(false);
      setSelfSendError(false);
      return;
    }

    if (connectedEmail && debouncedEmail.trim().toLowerCase() === connectedEmail.trim().toLowerCase()) {
      setRecipient(null);
      setSelfSendError(true);
      setSearched(true);
      return;
    }

    async function lookup() {
      setSearching(true);
      setSearched(true);
      try {
        const res = await fetch(`/api/users/search?identifier=${encodeURIComponent(debouncedEmail)}`);
        const result = await res.json();
        if (result.success && result.data?.found) {
          const targetWallet = result.data.walletAddress;
          if (connectedAddress && targetWallet?.toLowerCase() === connectedAddress.toLowerCase()) {
            setRecipient(null);
            setSelfSendError(true);
          } else {
            setRecipient(result.data);
            setSelfSendError(false);
          }
        } else {
          setRecipient(null);
          setSelfSendError(false);
        }
      } catch {
        setRecipient(null);
        setSelfSendError(false);
      } finally {
        setSearching(false);
      }
    }
    lookup();
  }, [debouncedEmail, connectedAddress, connectedEmail]);

  const handleContinue = () => {
    if (!recipient || !email || selfSendError) return;
    const params = new URLSearchParams({ email, ...(amount ? { amount } : {}) });
    router.push(`/send?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Email */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Recipient Email
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => { setEmail(e.target.value); }}
            id="qs-email"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm"
          />
        </div>

        {/* Recipient feedback */}
        <AnimatePresence mode="wait">
          {searching && (
            <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Resolving identity…
            </motion.div>
          )}
          {!searching && searched && recipient && (
            <motion.div key="found" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-400/8 border border-emerald-400/20">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-400">{recipient.displayName}</p>
                {recipient.homeRelay && (
                  <p className="text-[10px] text-muted-foreground">
                    Resolved via <span className="text-primary font-mono">{recipient.homeRelay}</span>
                  </p>
                )}
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 font-mono shrink-0">
                Verified ✓
              </span>
            </motion.div>
          )}
          {!searching && searched && selfSendError && (
            <motion.div key="selfsend" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="h-3.5 w-3.5 shrink-0" />
              You cannot send payments to yourself
            </motion.div>
          )}
          {!searching && searched && !recipient && !selfSendError && (
            <motion.div key="notfound" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 text-xs text-destructive">
              <XCircle className="h-3 w-3" />
              No HFI Pay account found
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Amount */}
      <div className="space-y-1.5">
        <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
          Amount (optional)
        </label>
        <div className="relative">
          <input
            type="number"
            step="0.0001"
            min="0.0001"
            placeholder="0.05"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            id="qs-amount"
            className="w-full px-4 py-2.5 pr-14 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all text-sm"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">ETH</span>
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!recipient || selfSendError}
        id="qs-continue"
        className="w-full py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-[1.01] disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 glow-sm cursor-pointer"
      >
        <Send className="h-3.5 w-3.5" />
        Continue to Send
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
