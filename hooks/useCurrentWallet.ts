"use client";

import { useAccount } from "wagmi";

export function useCurrentWallet() {
  const { address, isConnected, chain } = useAccount();

  return {
    wallet: address,
    isConnected,
    chain,
    shortWallet: address
      ? `${address.slice(0, 6)}...${address.slice(-4)}`
      : null,
  };
}
