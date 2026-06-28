/**
 * lib/blockchain/escrow.ts
 *
 * Server-side escrow contract helpers.
 *
 * All functions are READ-ONLY.
 * Write operations (createPayment, claimPayment, refundPayment) are
 * always initiated by the user's MetaMask wallet on the frontend.
 * The backend uses these helpers to VERIFY that transactions are real
 * before saving them to MongoDB.
 */

import { ethers } from "ethers";
import { escrowContract, provider } from "./client";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface OnChainPayment {
  id: number;
  sender: string;
  recipient: string;
  amount: string; // in wei (string)
  amountEth: string; // human-readable ETH
  createdAt: number; // unix timestamp
  expiry: number; // unix timestamp
  claimed: boolean;
  refunded: boolean;
  isExpired: boolean;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Fetch a single payment from the on-chain escrow contract.
 * Returns null if the payment doesn't exist or the contract isn't deployed.
 */
export async function getPaymentOnChain(
  paymentId: number,
): Promise<OnChainPayment | null> {
  try {
    const p = await escrowContract.getPayment(BigInt(paymentId));

    const now = Math.floor(Date.now() / 1000);

    return {
      id: Number(p.id),
      sender: p.sender as string,
      recipient: p.recipient as string,
      amount: p.amount.toString(),
      amountEth: ethers.formatEther(p.amount),
      createdAt: Number(p.createdAt),
      expiry: Number(p.expiry),
      claimed: p.claimed as boolean,
      refunded: p.refunded as boolean,
      isExpired: now > Number(p.expiry),
    };
  } catch (err) {
    console.error("[escrow.getPaymentOnChain]", err);
    return null;
  }
}

/**
 * Verify that a tx hash is confirmed on-chain and corresponds to a
 * PaymentCreated event with the expected recipient.
 *
 * Used by /api/intents/create to reject fake txHash submissions.
 */
export async function verifyPaymentTransaction(
  txHash: string,
  expectedRecipient: string,
): Promise<{
  valid: boolean;
  contractPaymentId?: number;
  amountEth?: string;
  reason?: string;
}> {
  try {
    // Fetch receipt
    const receipt = await provider.getTransactionReceipt(txHash);

    if (!receipt) {
      return {
        valid: false,
        reason: "Transaction not found or not yet confirmed",
      };
    }

    if (receipt.status !== 1) {
      return { valid: false, reason: "Transaction reverted" };
    }

    // Parse PaymentCreated event from logs
    const iface = escrowContract.interface;
    let contractPaymentId: number | undefined;
    let foundRecipient: string | undefined;
    let amountWei: bigint | undefined;

    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({
          topics: [...log.topics],
          data: log.data,
        });
        if (parsed && parsed.name === "PaymentCreated") {
          contractPaymentId = Number(parsed.args[0]); // id
          foundRecipient = parsed.args[2] as string; // recipient
          amountWei = parsed.args[3] as bigint; // amount
          break;
        }
      } catch {
        // Not this event - try next log
      }
    }

    if (contractPaymentId === undefined || !foundRecipient) {
      return {
        valid: false,
        reason: "PaymentCreated event not found in transaction",
      };
    }

    if (foundRecipient.toLowerCase() !== expectedRecipient.toLowerCase()) {
      return {
        valid: false,
        reason: `Recipient mismatch: tx has ${foundRecipient}, expected ${expectedRecipient}`,
      };
    }

    return {
      valid: true,
      contractPaymentId,
      amountEth:
        amountWei !== undefined ? ethers.formatEther(amountWei) : undefined,
    };
  } catch (err: any) {
    console.error("[escrow.verifyPaymentTransaction]", err);
    return { valid: false, reason: err.message ?? "Verification failed" };
  }
}

/**
 * Get the next payment ID (useful for debugging / dashboard stats).
 */
export async function getNextPaymentId(): Promise<number | null> {
  try {
    const id = await escrowContract.nextPaymentId();
    return Number(id);
  } catch {
    return null;
  }
}
