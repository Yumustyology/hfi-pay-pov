"use client";

import { useState } from "react";
import { Loader2, Check, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Props {
  intentId: string;
  senderWallet: string;
}

export default function ResendEmailButton({ intentId, senderWallet }: Props) {
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
      className={`flex items-center justify-end gap-1 text-[10px] transition-colors disabled:opacity-50 cursor-pointer ${
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
