"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useBalance } from "wagmi";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Wallet,
  Send,
  ArrowDownLeft,
  Clock,
  AlertCircle,
  Copy,
  Check,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { shortenWallet } from "@/lib/utils";

// Import modular dashboard components
import IdentityCard from "@/components/dashboard/IdentityCard";
import QuickSendWidget from "@/components/dashboard/QuickSendWidget";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import RegisterModal from "@/components/dashboard/RegisterModal";
import NotificationDrawer from "@/components/ui/NotificationDrawer";

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
  contractPaymentId?: number;
  senderUserId?: { displayName: string; walletAddress: string };
  recipientUserId?: { displayName: string; walletAddress: string };
}

interface UserProfile {
  displayName: string;
  walletAddress: string;
  homeRelay: string;
  preferredChain: string;
  email?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { address, isConnected, status } = useAccount();
  const { data: balanceData } = useBalance({ address });
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showNotifDrawer, setShowNotifDrawer] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

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
        setProfile({
          displayName: profileData.data.displayName,
          walletAddress: profileData.data.walletAddress,
          homeRelay: profileData.data.homeRelay,
          preferredChain: profileData.data.preferredChain,
          email: profileData.data.email,
        });
      } else {
        setProfile(null);
        setShowRegModal(true);
      }
      
      if (historyData.success) {
        const loadedIntents = historyData.data.intents ?? [];
        setIntents(loadedIntents);

        // Background sync: Check if any pending intents are already claimed on-chain
        const pendingIntents = loadedIntents.filter(
          (i: Intent) => !["CLAIMED", "REFUNDED"].includes(i.status) && i.contractPaymentId !== undefined && i.contractPaymentId !== null
        );

        if (pendingIntents.length > 0) {
          Promise.all(
            pendingIntents.map(async (intent: Intent) => {
              try {
                const checkRes = await fetch(`/api/intents/check-chain?id=${intent.contractPaymentId}`);
                const checkData = await checkRes.json();
                if (checkData.success && checkData.data?.claimed) {
                  // Sync database status to CLAIMED
                  await fetch("/api/intents/claim", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      reference: intent.reference,
                      claimantWallet: intent.recipientWallet,
                    }),
                  });
                  // Update local state status to avoid waiting for reload
                  setIntents((prev) =>
                    prev.map((p) =>
                      p._id === intent._id ? { ...p, status: "CLAIMED" } : p
                    )
                  );
                }
              } catch (e) {
                console.error("Failed background status sync on dashboard", e);
              }
            })
          ).catch(() => {});
        }
      }
    } catch {
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return;
    if (status === "disconnected") { router.push("/"); return; }
    load();
  }, [status, load, router]);

  // Poll unread count for bell badge
  useEffect(() => {
    if (!address) return;
    const fetchCount = () =>
      fetch(`/api/notifications?walletAddress=${address}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.success) {
            const unread = (d.data.notifications ?? []).filter((n: any) => !n.read).length;
            setUnreadNotifCount(unread);
          }
        })
        .catch(() => {});
    fetchCount();
    const interval = setInterval(fetchCount, 30_000);
    return () => clearInterval(interval);
  }, [address]);

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
        <IdentityCard profile={profile} onRegisterClick={() => setShowRegModal(true)} />

        {/* Quick Send */}
        <motion.div variants={item} className="glass border border-white/[0.07] rounded-2xl p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Send className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full glass border border-white/[0.06] text-muted-foreground">
              Quick Send
            </span>
          </div>
          <QuickSendWidget connectedAddress={address} connectedEmail={profile?.email} />
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

      {/* Notification Drawer */}
      <NotificationDrawer
        open={showNotifDrawer}
        onClose={() => {
          setShowNotifDrawer(false);
          // Re-fetch unread count after drawer closes (items may have been marked read)
          if (address) {
            fetch(`/api/notifications?walletAddress=${address}`)
              .then((r) => r.json())
              .then((d) => {
                if (d.success) {
                  setUnreadNotifCount(
                    (d.data.notifications ?? []).filter((n: any) => !n.read).length
                  );
                }
              })
              .catch(() => {});
          }
        }}
        address={address}
      />
    </div>
  );
}



