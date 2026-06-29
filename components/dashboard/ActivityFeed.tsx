"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ArrowDownLeft,
  Clock,
  RotateCcw,
  Mail,
  CheckCircle2,
  ExternalLink,
  Unlock,
  AlertCircle,
} from "lucide-react";
import { shortenWallet, formatDate } from "@/lib/utils";
import ResendEmailButton from "./ResendEmailButton";

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

type Tab = "all" | "pending" | "claimed" | "refunded";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  CREATED:    { label: "Created",   color: "text-sky-400 bg-sky-400/10 border-sky-400/20",      icon: Clock },
  FUNDED:     { label: "Funded",    color: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20", icon: Clock },
  EMAIL_SENT: { label: "Notified",  color: "text-violet-400 bg-violet-400/10 border-violet-400/20", icon: Mail },
  CLAIMED:    { label: "Claimed",   color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2 },
  REFUNDED:   { label: "Refunded",  color: "text-amber-400 bg-amber-400/10 border-amber-400/20",  icon: RotateCcw },
};

interface Props {
  intents: Intent[];
  address?: string;
}

export default function ActivityFeed({ intents, address }: Props) {
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
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
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
            {tab === "all" ? (
              <Link href="/send" className="text-primary hover:underline">Send your first payment</Link>
            ) : (
              `No ${tab} transactions`
            )}
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
              const canClaim = !isSender && ["FUNDED", "EMAIL_SENT", "CREATED"].includes(intent.status);
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
                      {isSender ? (
                        <Send className="h-4 w-4 text-primary" />
                      ) : (
                        <ArrowDownLeft className="h-4 w-4 text-emerald-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate text-foreground">
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
                    {canClaim && (
                      <Link
                        href={`/receive?id=${intent._id}`}
                        className="flex items-center justify-end gap-1 text-[10px] font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <Unlock className="h-2.5 w-2.5" />
                        Claim now
                      </Link>
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
