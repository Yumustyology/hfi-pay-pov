import connectDB from "@/lib/mongodb";
import { Notification } from "@/models/Notification";

export type NotificationType =
  | "payment_received"
  | "payment_sent"
  | "payment_claimed"
  | "payment_refunded";

export async function createNotification(data: {
  type: NotificationType;
  userId: string;
  intentId?: string;
  title: string;
  message: string;
}) {
  await connectDB();
  return Notification.create(data);
}

export async function createNotifications(
  items: Array<{
    type: NotificationType;
    userId: string;
    intentId?: string;
    title: string;
    message: string;
  }>
) {
  await connectDB();
  return Notification.insertMany(items);
}

export async function getNotifications(userId: string) {
  await connectDB();
  return Notification.find({ userId }).sort({ createdAt: -1 }).limit(50);
}

export async function markRead(notificationId: string) {
  await connectDB();
  return Notification.findByIdAndUpdate(notificationId, { read: true }, { new: true });
}

export async function markAllRead(userId: string) {
  await connectDB();
  return Notification.updateMany({ userId, read: false }, { read: true });
}
