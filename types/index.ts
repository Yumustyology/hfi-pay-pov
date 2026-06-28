export interface IUser {
  _id?: string;
  email: string;
  walletAddress: string;
  displayName: string;
  avatar?: string;
  preferredChain: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IIntent {
  _id?: string;
  senderWallet: string;
  senderId?: string;
  recipientEmail: string;
  recipientWallet?: string;
  recipientId?: string;
  amount: number;
  amountWei?: string;
  txHash?: string;
  claimTxHash?: string;
  refundTxHash?: string;
  status: "pending" | "funded" | "claimed" | "refunded" | "expired";
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface INotification {
  _id?: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  intentId?: string;
  createdAt?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}
