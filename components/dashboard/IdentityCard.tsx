"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Server, Plus, Check, Copy } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  displayName: string;
  walletAddress: string;
  homeRelay: string;
  preferredChain: string;
  email?: string;
}

interface Props {
  profile: UserProfile | null;
  onRegisterClick: () => void;
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function IdentityCard({ profile, onRegisterClick }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!profile?.email) return;
    navigator.clipboard.writeText(profile.email);
    setCopied(true);
    toast.success("Email address copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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
          {profile.email && (
            <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.05] rounded-xl px-3 py-1.5 hover:bg-white/[0.05] transition-colors">
              <span className="text-xs text-muted-foreground font-mono truncate mr-2" title={profile.email}>
                {profile.email}
              </span>
              <button
                onClick={handleCopy}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-white/[0.05] cursor-pointer shrink-0"
                title="Copy email"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <Server className="h-3.5 w-3.5 text-primary animate-pulse" />
            <span>Resolved via <span className="text-primary font-mono">{profile.homeRelay}</span></span>
          </div>
        </div>
      ) : (
        <button
          onClick={onRegisterClick}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer bg-transparent border-none p-0"
        >
          <Plus className="h-3 w-3" />
          Register identity
        </button>
      )}
    </motion.div>
  );
}
