import mongoose, { Schema, Document, models, model } from "mongoose";

export interface IRelay extends Document {
  relayId: string;
  name: string;
  endpoint: string;
  status: "ONLINE" | "OFFLINE" | "DEGRADED";
  supportedIdentifiers: string[];
  supportedChains: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RelaySchema = new Schema<IRelay>(
  {
    relayId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    endpoint: { type: String, required: true },
    status: {
      type: String,
      enum: ["ONLINE", "OFFLINE", "DEGRADED"],
      default: "ONLINE",
    },
    supportedIdentifiers: { type: [String], default: ["email"] },
    supportedChains: { type: [String], default: ["Base Sepolia"] },
  },
  { timestamps: true }
);

export const Relay = models.Relay || model<IRelay>("Relay", RelaySchema);
