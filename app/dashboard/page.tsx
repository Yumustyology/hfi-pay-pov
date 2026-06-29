"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useBalance } from "wagmi";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  Mail,
  Send,
  ArrowDownLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  Clock,
  RotateCcw,
  ExternalLink,
  Plus,
  Loader2,
  XCircle,
  Server,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatEth, shortenWallet, formatDate } from "@/lib/utils";

interface Intent {
  _id: string;
  reference: string;
  senderWallet: string;
  recipientWallet: string;
  recipientEmail: string;
  amount: string;
  status: string;
  txHash?: string;
  createdAt: string;
  senderUserId?: { displayName: string; walletAddress: string };
  recipientUserId?: { displayName: string; walletAddress: string };
}

interface UserProfile {
  displayName: string;
  walletAddress: string;
  homeRelay: string;
  preferredChain: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  CREATED:    { label: "Created",   color: "text-sky-400 bg-sky-400/10 border-sky-400/20",      icon: Clock },
  FUNDED:     { label: "Funded",    color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20", icon: Clock },
  EMAIL_SENT: { label: "Notified",  color: "text-violet-400 bg-violet-400/10 border-violet-400/20", icon: Mail },
  CLAIMED:    { label: "Claimed",   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  REFUNDED:   { label: "Refunded",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20",  icon: RotateCcw },
};

type Tab = "all" | "pending" | "claimed" | "refunded";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Quick Send Widget ────────────────────────────────────────────────────────

function QuickSendWidget() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [debouncedEmail, setDebouncedEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
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
      return;
    }
    async function lookup() {
      setSearching(true);
      setSearched(true);
      try {
        const res = await fetch(`/api/users/search?identifier=${encodeURIComponent(debouncedEmail)}`);
        const result = await res.json();
        if (result.success && result.data?.found) {
          setRecipient(result.data);
        } else {
          setRecipient(null);
        }
      } catch {
        setRecipient(null);
      } finally {
        setSearching(false);
      }
    }
    lookup();
  }, [debouncedEmail]);

  const handleContinue = () => {
    if (!recipient || !email) return;
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
          {!searching && searched && !recipient && (
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
        disabled={!recipient}
        id="qs-continue"
        className="w-full py-2.5 rounded-xl gradient-brand text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-[1.01] disabled:opacity-30 disabled:cursor-not-allowed disabled:scale-100 glow-sm"
      >
        <Send className="h-3.5 w-3.5" />
        Continue to Send
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Resend Email Button ──────────────────────────────────────────────────────

function ResendEmailButton({ intentId, senderWallet }: { intentId: string; senderWallet: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleResend() {
    setSending(true);
    try {
      const res = await fetch("/api/intents/resend-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intentId, senderWallet }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to resend email");
      } else {
        toast.success("Claim email resent successfully!");
        setSent(true);
        setTimeout(() => setSent(false), 4000);
      }
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSending(false);
    }
  }

  return (
    <button
      onClick={handleResend}
      disabled={sending}
      title="Resend claim email to recipient"
      className={`flex items-center justify-end gap-1 text-[10px] transition-colors disabled:opacity-50 ${
        sent
          ? "text-emerald-400"
          : "text-muted-foreground hover:text-violet-400"
      }`}
    >
      {sending ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : sent ? (
        <Check className="h-2.5 w-2.5" />
      ) : (
        <RefreshCw className="h-2.5 w-2.5" />
      )}
      {sending ? "Sending…" : sent ? "Sent!" : "Resend email"}
    </button>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────


function ActivityFeed({ intents, address }: { intents: Intent[]; address?: string }) {
  const [tab, setTab] = useState<Tab>("all");

  const filtered = intents.filter((i) => {
    if (tab === "pending") return !["CLAIMED", "REFUNDED"].includes(i.status);
    if (tab === "claimed") return i.status === "CLAIMED";
    if (tab === "refunded") return i.status === "REFUNDED";
    return true;
  });

  const pendingCount = intents.filter((i) => !["CLAIMED", "REFUNDED"].includes(i.status)).length;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all",      label: "All",      count: intents.length },
    { key: "pending",  label: "Pending",  count: pendingCount },
    { key: "claimed",  label: "Claimed" },
    { key: "refunded", label: "Refunded" },
  ];

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.05]">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            id={`activity-tab-${key}`}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tab === key
                ? "bg-primary/20 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            {typeof count === "number" && count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                tab === key ? "bg-primary/20 text-primary" : "bg-white/[0.06] text-muted-foreground"
              }`}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto stroke-1 mb-2" />
          <p className="text-sm">
            {tab === "all"
              ? <Link href="/send" className="text-primary hover:underline">Send your first payment</Link>
              : `No ${tab} transactions`}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04] max-h-[480px] overflow-y-auto">
          <AnimatePresence initial={false}>
            {filtered.map((intent) => {
              const isSender = intent.senderWallet?.toLowerCase() === address?.toLowerCase();
              const cfg = STATUS_CONFIG[intent.status] ?? STATUS_CONFIG.CREATED;
              const StatusIcon = cfg.icon;
              const canResend = isSender && ["FUNDED", "EMAIL_SENT", "CREATED"].includes(intent.status);
              return (
                <motion.div
                  key={intent._id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-between py-4 gap-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isSender ? "bg-primary/10" : "bg-emerald-400/10"
                    }`}>
                      {isSender
                        ? <Send className="h-4 w-4 text-primary" />
                        : <ArrowDownLeft className="h-4 w-4 text-emerald-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isSender ? intent.recipientEmail : shortenWallet(intent.senderWallet)}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">{intent.reference}</p>
                      <p className="text-[11px] text-muted-foreground">{formatDate(intent.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className={`font-semibold text-sm ${isSender ? "text-foreground" : "text-emerald-400"}`}>
                      {isSender ? "-" : "+"}{intent.amount} ETH
                    </p>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {cfg.label}
                    </span>
                    {intent.txHash && (
                      <a
                        href={`https://sepolia.basescan.org/tx/${intent.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground hover:text-primary transition-colors"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        On-chain
                      </a>
                    )}
                    {canResend && (
                      <ResendEmailButton intentId={intent._id} senderWallet={address!} />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success("Wallet address copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }, [address]);

  const load = useCallback(async () => {
    if (!address) return;
    try {
      setLoading(true);
      const [profileRes, historyRes] = await Promise.all([
        fetch(`/api/users/search?walletAddress=${address}`),
        fetch(`/api/intents/history?walletAddress=${address}`),
      ]);
      const [profileData, historyData] = await Promise.all([
        profileRes.json(),
        historyRes.json(),
      ]);
      if (profileData.success && profileData.data?.found) {
        setProfile(profileData.data);
      } else {
        setProfile(null);
        setShowRegModal(true);
      }
      if (historyData.success) setIntents(historyData.data.intents ?? []);
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!isConnected) { router.push("/"); return; }
    load();
  }, [isConnected, load, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full gradient-brand animate-pulse glow-primary" />
          <p className="text-muted-foreground animate-pulse">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const sent = intents.filter((i) => i.senderWallet?.toLowerCase() === address?.toLowerCase());
  const received = intents.filter((i) => i.recipientWallet?.toLowerCase() === address?.toLowerCase());
  const pendingCount = intents.filter((i) => !["CLAIMED", "REFUNDED"].includes(i.status)).length;

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 max-w-7xl mx-auto">
      {/* ── Top header ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
      >
        <div>
          <p className="text-sm text-muted-foreground mb-1">Welcome back</p>
          <h1 className="text-3xl font-bold">
            {profile?.displayName
              ? <><span className="gradient-text">{profile.displayName}</span></>
              : "Your Dashboard"}
          </h1>
        </div>
        <Link
          href="/send"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-brand text-white font-semibold hover:opacity-90 transition-all hover:scale-[1.02] glow-sm self-start sm:self-auto"
          id="dashboard-send-btn"
        >
          <Send className="h-4 w-4" />
          Send Payment
        </Link>
      </motion.div>

      {/* Identity warning banner */}
      {!profile && (
        <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />
            <p className="text-sm">
              Your connected wallet <span className="font-mono bg-white/[0.04] px-1.5 py-0.5 rounded text-white text-xs">{address?.slice(0, 6)}...{address?.slice(-4)}</span> is not linked to an email identity.
            </p>
          </div>
          <button
            onClick={() => setShowRegModal(true)}
            className="text-xs font-bold text-amber-400 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition-all cursor-pointer self-start sm:self-auto shrink-0"
          >
            Link Email Identity
          </button>
        </div>
      )}

      {/* ── Top row: Wallet + Identity + Quick Send ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5"
      >
        {/* Wallet Card */}
        <motion.div variants={item} className="glass card-shine border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center glow-sm">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full glass border border-white/[0.06] text-muted-foreground font-mono">
              Base Sepolia
            </span>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Wallet Balance</p>
          <p className="text-4xl font-bold tracking-tight mb-1">
            {balanceData ? `${parseFloat(balanceData.formatted).toFixed(4)}` : "0.0000"}
            <span className="text-base text-muted-foreground font-normal ml-1.5">
              {balanceData?.symbol ?? "ETH"}
            </span>
          </p>
          {address && (
            <div className="flex items-center justify-between mt-3 bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-1.5 hover:bg-white/[0.05] transition-colors">
              <span className="text-xs text-muted-foreground font-mono truncate mr-2" title={address}>
                {shortenWallet(address)}
              </span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-white/[0.05] cursor-pointer shrink-0"
                title="Copy full address"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* Identity Card */}
        <motion.div variants={item} className="glass border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-violet-400/15 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-violet-400" />
            </div>
            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
              profile
                ? "text-emerald-400 bg-emerald-400/10 border border-emerald-400/20"
                : "text-muted-foreground bg-white/[0.04] border border-white/[0.06]"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${profile ? "bg-emerald-400 pulse-dot" : "bg-muted-foreground"}`} />
              {profile ? "Verified" : "Unverified"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">HFI Identity</p>
          <p className="text-xl font-bold mb-3">
            {profile?.displayName ?? <span className="text-muted-foreground text-base font-normal">Not registered</span>}
          </p>
          {profile ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail className="h-3 w-3 text-emerald-400" />
                <span>✅ Email identity linked</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Server className="h-3 w-3 text-primary" />
                <span>Resolved via <span className="text-primary font-mono">{profile.homeRelay}</span></span>
              </div>
            </div>
          ) : (
            <Link href="/register" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
              <Plus className="h-3 w-3" />
              Register identity
            </Link>
          )}
        </motion.div>

        {/* Quick Send */}
        <motion.div variants={item} className="glass border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Quick Send</p>
              <p className="text-xs text-muted-foreground">Type email to verify recipient</p>
            </div>
          </div>
          <QuickSendWidget />
        </motion.div>
      </motion.div>

      {/* ── Stats strip ── */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-3 gap-4 mb-5"
      >
        {[
          { label: "Sent", value: sent.length, color: "text-primary", bg: "bg-primary/10", Icon: Send },
          { label: "Received", value: received.length, color: "text-emerald-400", bg: "bg-emerald-400/10", Icon: ArrowDownLeft },
          { label: "Pending", value: pendingCount, color: "text-amber-400", bg: "bg-amber-400/10", Icon: Clock },
        ].map(({ label, value, color, bg, Icon }) => (
          <motion.div key={label} variants={item} className="glass border border-white/[0.07] rounded-2xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Full transaction history ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="glass border border-white/[0.07] rounded-2xl p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <h2 className="font-semibold">Transaction History</h2>
          </div>
          <span className="text-xs text-muted-foreground">{intents.length} total</span>
        </div>
        <ActivityFeed intents={intents} address={address} />
      </motion.div>

      {/* Inline Registration & OTP Verification Modal */}
      <RegisterModal
        isOpen={showRegModal}
        onClose={() => setShowRegModal(false)}
        walletAddress={address ?? ""}
        onSuccess={(newProfile) => {
          setProfile(newProfile);
          // Refresh dashboard data
          load();
        }}
      />
    </div>
  );
}

// ─── Inline Register & OTP Verification Modal Component ───────────────────────

function RegisterModal({
  isOpen,
  onClose,
  walletAddress,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSuccess: (profile: UserProfile) => void;
}) {
  const [step, setStep] = useState<"info" | "otp">("info");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
        setCountdown(30);
        toast.success("Verification code sent to your email!");
      } else {
        setError(data.error ?? "Failed to send verification code");
      }
    } catch {
      setError("Failed to connect. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setCountdown(30);
        toast.success("Verification code resent successfully!");
      } else {
        setError(data.error ?? "Failed to resend code");
      }
    } catch {
      setError("Failed to resend. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          walletAddress,
          otp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Identity created successfully!");
        // Set the wallet cookie client-side
        document.cookie = `hfi_wallet=${walletAddress}; path=/; max-age=${30 * 24 * 60 * 60}`;
        onSuccess({
          displayName,
          walletAddress,
          homeRelay: data.data.homeRelay ?? "relay-hfi-01",
          preferredChain: data.data.preferredChain ?? "Base Sepolia",
        });
        onClose();
      } else {
        setError(data.error ?? "Verification failed. Try again.");
      }
    } catch {
      setError("Failed to verify code. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      <div className="w-full max-w-md glass border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <XCircle className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 mb-3 shadow-md glow-sm">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Link HFI Identity</h2>
          <p className="text-muted-foreground text-xs mt-1">
            Register your email to enable passwordless transfers.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center flex items-center justify-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "info" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground" htmlFor="modal-name">
                Display Name
              </label>
              <input
                id="modal-name"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground" htmlFor="modal-email">
                Email Address
              </label>
              <input
                id="modal-email"
                type="email"
                required
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg glow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Request Verification Code</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">
              We've sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 font-mono tracking-[0.5em] text-center text-xl transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep("info")}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                ← Back
              </button>

              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleResendOtp}
                className="text-primary hover:text-primary-foreground font-semibold disabled:text-muted-foreground transition-colors cursor-pointer"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg glow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify & Link Account</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

