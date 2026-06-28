/**
 * features/relay/relay.service.ts
 *
 * Today:  resolves identifiers via MongoDB directly.
 * Later:  replace findOne() with an HTTP request to the relay's endpoint.
 *         The callers (API routes, intent service) never change.
 */

import { findByEmail, findByWallet } from "@/lib/services/user.service";
import { DEFAULT_RELAY_ID } from "./relay.constants";
import type { ResolvedIdentity } from "./relay.types";

/**
 * Resolve an email (or any future identifier) to a wallet address.
 * This is the core relay primitive: identifier → identity.
 */
export async function resolveIdentifier(
  identifier: string
): Promise<ResolvedIdentity | null> {
  const normalized = identifier.trim().toLowerCase();
  const user = await findByEmail(normalized);
  if (!user) return null;

  return {
    relayId: user.homeRelay ?? DEFAULT_RELAY_ID,
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    homeRelay: user.homeRelay ?? DEFAULT_RELAY_ID,
    preferredChain: user.preferredChain ?? "Base Sepolia",
    user: user.toObject(),
  };
}

/**
 * Resolve by wallet address — used by dashboard to load the current user's profile.
 */
export async function resolveWallet(
  walletAddress: string
): Promise<ResolvedIdentity | null> {
  const user = await findByWallet(walletAddress);
  if (!user) return null;

  return {
    relayId: user.homeRelay ?? DEFAULT_RELAY_ID,
    walletAddress: user.walletAddress,
    displayName: user.displayName,
    homeRelay: user.homeRelay ?? DEFAULT_RELAY_ID,
    preferredChain: user.preferredChain ?? "Base Sepolia",
    user: user.toObject(),
  };
}
