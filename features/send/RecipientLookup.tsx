"use client";

import { useEffect, useState } from "react";

export interface ResolvedRecipient {
  displayName: string;
  walletAddress: string; // wallet field from relay response
  homeRelay: string;     // relayId field from relay response
  isVerified: boolean;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onResolved: (recipient: ResolvedRecipient | null) => void;
  disabled?: boolean;
  connectedAddress?: string;
  connectedEmail?: string;
}

/**
 * RecipientLookup
 *
 * Debounced email input. Calls POST /api/relay/resolve after 500ms idle.
 * This is the exact API the production system will expose — today it resolves
 * via MongoDB, later via relay network. The component never changes.
 */
export default function RecipientLookup({ value, onChange, onResolved, disabled, connectedAddress, connectedEmail }: Props) {
  const [status, setStatus] = useState<"idle" | "searching" | "found" | "not_found" | "self_send">("idle");
  const [recipient, setRecipient] = useState<ResolvedRecipient | null>(null);
  const [debounced, setDebounced] = useState(value);

  // 500ms debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), 500);
    return () => clearTimeout(t);
  }, [value]);

  // POST /api/relay/resolve
  useEffect(() => {
    if (!debounced || !debounced.includes("@")) {
      setStatus("idle");
      setRecipient(null);
      onResolved(null);
      return;
    }

    if (connectedEmail && debounced.trim().toLowerCase() === connectedEmail.trim().toLowerCase()) {
      setRecipient(null);
      setStatus("self_send");
      onResolved(null);
      return;
    }

    let cancelled = false;
    setStatus("searching");

    fetch("/api/relay/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: debounced }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.data?.found) {
          const targetWallet = data.data.wallet;
          if (connectedAddress && targetWallet.toLowerCase() === connectedAddress.toLowerCase()) {
            setRecipient(null);
            setStatus("self_send");
            onResolved(null);
            return;
          }
          const r: ResolvedRecipient = {
            displayName: data.data.displayName,
            walletAddress: targetWallet,
            homeRelay: data.data.relayId,
            isVerified: data.data.verified,
          };
          setRecipient(r);
          setStatus("found");
          onResolved(r);
        } else {
          setRecipient(null);
          setStatus("not_found");
          onResolved(null);
        }
      })
      .catch(() => {
        if (!cancelled) { setStatus("not_found"); onResolved(null); }
      });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, connectedAddress, connectedEmail]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="recipient-identifier">
        Recipient Email
      </label>
      <input
        id="recipient-identifier"
        type="email"
        placeholder="recipient@example.com"
        value={value}
        onChange={(e) => { onChange(e.target.value); }}
        disabled={disabled}
        autoComplete="off"
        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm disabled:opacity-50"
      />

      {status === "searching" && (
        <p className="text-xs text-muted-foreground">Querying relay-hfi-01…</p>
      )}

      {status === "found" && recipient && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-400">{recipient.displayName}</span>
            <span className="text-xs border border-emerald-500/30 text-emerald-400 rounded-full px-2 py-0.5">
              ✓ Verified
            </span>
          </div>
          <p className="text-xs font-mono text-muted-foreground">
            {recipient.walletAddress.slice(0, 10)}…{recipient.walletAddress.slice(-8)}
          </p>
          <p className="text-xs text-muted-foreground">
            Resolved via{" "}
            <span className="text-primary font-mono">{recipient.homeRelay}</span>
          </p>
        </div>
      )}

      {status === "not_found" && debounced.includes("@") && (
        <p className="text-xs text-destructive">No HFI Pay account found for this email</p>
      )}

      {status === "self_send" && (
        <p className="text-xs text-destructive">You cannot send payments to your own wallet</p>
      )}
    </div>
  );
}
