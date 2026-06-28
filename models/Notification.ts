import mongoose, { Schema, Document, models, model } from "mongoose";

export type NotificationType = "payment_received" | "payment_claimed" | "payment_refunded" | "payment_sent";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  intentId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["payment_received", "payment_claimed", "payment_refunded", "payment_sent"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    intentId: { type: Schema.Types.ObjectId, ref: "Intent" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Notification =
  models.Notification || model<INotification>("Notification", NotificationSchema);
