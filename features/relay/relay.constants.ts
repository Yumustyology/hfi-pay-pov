import type { Relay } from "./relay.types";

export const DEFAULT_RELAY_ID = "relay-hfi-01";

/**
 * All relays in the HFI network.
 * Only relay-hfi-01 is ONLINE in the PoV.
 * relay-west-africa and relay-europe are seeded as OFFLINE — the UI shows
 * them in the relay registry so the architecture looks intentional.
 * In production each relay runs independently and resolves its own users.
 */
export const ALL_RELAYS: Relay[] = [
  {
    relayId: "relay-hfi-01",
    name: "HFI Official Relay",
    endpoint: "/api/relay",
    status: "ONLINE",
    supportedIdentifiers: ["email"],
    supportedChains: ["Base Sepolia"],
  },
  {
    relayId: "relay-west-africa",
    name: "West Africa Relay",
    endpoint: "https://wa.relay.hfi.network/api",
    status: "OFFLINE",
    supportedIdentifiers: ["email"],
    supportedChains: ["Base Sepolia"],
  },
  {
    relayId: "relay-europe",
    name: "Europe Relay",
    endpoint: "https://eu.relay.hfi.network/api",
    status: "OFFLINE",
    supportedIdentifiers: ["email"],
    supportedChains: ["Base Sepolia", "Ethereum"],
  },
];

export const DEFAULT_RELAY: Relay = ALL_RELAYS[0];
