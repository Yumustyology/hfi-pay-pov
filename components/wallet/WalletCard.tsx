"use client";

import { useCurrentWallet } from "@/hooks/useCurrentWallet";

export default function WalletCard() {
  const { wallet, isConnected, chain, shortWallet } = useCurrentWallet();

  if (!isConnected) return null;

  return (
    <div className="rounded-xl border p-5 space-y-2 bg-card">
      <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
        Connected Wallet
      </h2>
      <p className="font-mono text-sm break-all">{wallet}</p>
      {chain && (
        <span className="inline-flex items-center gap-1.5 text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
          {chain.name}
        </span>
      )}
    </div>
  );
}
