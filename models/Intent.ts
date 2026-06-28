import { Schema, Document, models, model, Types } from "mongoose";

export interface IIntentDoc extends Document {
  reference: string;
  senderUserId: Types.ObjectId;
  recipientUserId: Types.ObjectId;
  senderWallet: string;
  recipientWallet: string;
  recipientEmail: string;
  amount: string;
  txHash: string;
  claimTxHash?: string;
  refundTxHash?: string;
  contractPaymentId?: number | null;
  relayId?: string;
  status: "CREATED" | "FUNDED" | "EMAIL_SENT" | "CLAIMED" | "REFUNDED" | "EXPIRED";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const IntentSchema = new Schema<IIntentDoc>(
  {
    reference: { type: String, required: true, unique: true, index: true },
    senderUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderWallet: { type: String, required: true, lowercase: true },
    recipientWallet: { type: String, required: true, lowercase: true },
    recipientEmail: { type: String, required: true, lowercase: true },
    amount: { type: String, required: true },
    txHash: { type: String, required: true, unique: true },
    claimTxHash: { type: String },
    refundTxHash: { type: String },
    contractPaymentId: { type: Number, default: null },
    relayId: { type: String, default: "relay-hfi-01" },
    status: {
      type: String,
      enum: ["CREATED", "FUNDED", "EMAIL_SENT", "CLAIMED", "REFUNDED", "EXPIRED"],
      default: "FUNDED",
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  },
  { timestamps: true }
);

export const Intent = models.Intent || model<IIntentDoc>("Intent", IntentSchema);
