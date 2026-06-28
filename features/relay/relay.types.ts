// ─── Relay Types ──────────────────────────────────────────────────────────────

export interface Relay {
  relayId: string;
  name: string;
  endpoint: string;
  status: "ONLINE" | "OFFLINE" | "DEGRADED";
  supportedIdentifiers: string[];
  supportedChains: string[];
}

export interface ResolvedIdentity {
  relayId: string;
  walletAddress: string;
  displayName: string;
  homeRelay: string;
  preferredChain: string;
  /** The raw Mongoose user document */
  user: Record<string, unknown>;
}
