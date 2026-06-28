/**
 * lib/blockchain/client.ts
 *
 * Read-only server-side Ethereum client.
 *
 * Architecture decision: The backend NEVER holds a signer for payments.
 * Senders sign transactions in their own MetaMask wallet (non-custodial).
 * This client is used only for:
 *   - Reading on-chain payment state
 *   - Verifying transactions submitted by the frontend
 *   - Future: listening to contract events
 */

import { ethers } from "ethers";
import { ESCROW_ABI } from "@/contracts/abi";
import { getContractAddress } from "@/contracts/deployed";

const BASE_SEPOLIA_CHAIN_ID = 84532;

// Public read-only provider - no private key needed
const provider = new ethers.JsonRpcProvider(
  process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org",
);

// Read-only contract instance (no signer)
export const escrowContract = new ethers.Contract(
  getContractAddress(BASE_SEPOLIA_CHAIN_ID, "escrow"),
  ESCROW_ABI,
  provider,
);

export { provider };
export { BASE_SEPOLIA_CHAIN_ID };
