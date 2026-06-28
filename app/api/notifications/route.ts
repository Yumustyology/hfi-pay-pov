import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Notification } from "@/models/Notification";
import User from "@/models/User";
import { success, failure } from "@/lib/response";

// GET notifications for a wallet address
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress) {
      return failure("Missing walletAddress parameter", 400);
    }

    const user = await User.findOne({
      walletAddress: { $regex: new RegExp(`^${walletAddress}$`, "i") }
    });

    if (!user) {
      return success({ notifications: [] });
    }

    const notifications = await Notification.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return success({ notifications });

  } catch (error: any) {
    return failure(error.message || "Internal server error", 500);
  }
}

// PATCH mark notification(s) as read
export async function PATCH(req: NextRequest) {
  try {
    await connectDB();
    const { notificationId, walletAddress } = await req.json();

    if (notificationId) {
      const notification = await Notification.findByIdAndUpdate(
        notificationId,
        { read: true },
        { new: true }
      );
      return success({ notification });
    }

    if (walletAddress) {
      const user = await User.findOne({
        walletAddress: { $regex: new RegExp(`^${walletAddress}$`, "i") }
      });
      if (user) {
        await Notification.updateMany({ userId: user._id, read: false }, { read: true });
      }
      return success({ message: "All notifications marked as read" });
    }

    return failure("Missing notificationId or walletAddress", 400);

  } catch (error: any) {
    return failure(error.message || "Internal server error", 500);
  }
}
