// ─── Intent Types ─────────────────────────────────────────────────────────────

export type IntentStatus =
  | "CREATED"
  | "FUNDED"
  | "EMAIL_SENT"
  | "CLAIMED"
  | "REFUNDED"
  | "EXPIRED";

export interface CreateIntentInput {
  senderWallet: string;
  recipientEmail: string;
  amount: string;
  txHash: string;
  contractPaymentId?: number;
}

export interface ClaimIntentInput {
  reference: string;
  claimantWallet: string;
  txHash?: string;
}

export interface RefundIntentInput {
  reference: string;
  requesterWallet: string;
  txHash?: string;
}

export interface IntentResult {
  reference: string;
  status: IntentStatus;
  amount: string;
  txHash?: string;
  contractPaymentId?: number | null;
}
