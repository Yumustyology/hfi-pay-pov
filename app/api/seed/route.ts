import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { Relay } from "@/models/Relay";
import { Intent } from "@/models/Intent";
import { Notification } from "@/models/Notification";
import { ALL_RELAYS } from "@/features/relay/relay.constants";
import { generateReference } from "@/lib/reference";
import { success, failure } from "@/lib/response";

/**
 * POST /api/seed
 *
 * Idempotent — safe to call multiple times.
 * Seeds: 3 relays, 5 demo users, 4 sample intents, notifications.
 */

const DEMO_USERS = [
  {
    displayName: "Aisha Mohammed",
    email: "aisha@demo.hfipay.dev",
    walletAddress: "0x84a5b3f2c1d0e8a17f4b9c2e5d6f1a8b4c3d9e2f",
    homeRelay: "relay-hfi-01",
  },
  {
    displayName: "John Chen",
    email: "john@demo.hfipay.dev",
    walletAddress: "0x9ba2c1f3d4e5a6b7c8d9e0f1a2b3c4d5e6f7a8b9",
    homeRelay: "relay-west-africa",
  },
  {
    displayName: "Fatima Al-Rashid",
    email: "fatima@demo.hfipay.dev",
    walletAddress: "0xcc3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d",
    homeRelay: "relay-europe",
  },
  {
    displayName: "Marcus Johnson",
    email: "marcus@demo.hfipay.dev",
    walletAddress: "0x7d1e5f6a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
    homeRelay: "relay-hfi-01",
  },
  {
    displayName: "Priya Patel",
    email: "priya@demo.hfipay.dev",
    walletAddress: "0x3e8f6a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    homeRelay: "relay-hfi-01",
  },
];

export async function POST(_req: NextRequest) {
  try {
    await connectDB();

    // ── Relays ────────────────────────────────────────────────────────────────
    await Promise.all(
      ALL_RELAYS.map((r) =>
        Relay.updateOne({ relayId: r.relayId }, { $set: r }, { upsert: true })
      )
    );

    // ── Users ─────────────────────────────────────────────────────────────────
    const createdUsers: Record<string, any> = {};
    for (const u of DEMO_USERS) {
      const user = await User.findOneAndUpdate(
        { email: u.email },
        {
          $setOnInsert: {
            ...u,
            isVerified: true,
            preferredChain: "Base Sepolia",
          },
        },
        { upsert: true, new: true }
      );
      createdUsers[u.email] = user;
    }

    const aisha = createdUsers["aisha@demo.hfipay.dev"];
    const john = createdUsers["john@demo.hfipay.dev"];
    const fatima = createdUsers["fatima@demo.hfipay.dev"];
    const marcus = createdUsers["marcus@demo.hfipay.dev"];
    const priya = createdUsers["priya@demo.hfipay.dev"];

    // ── Intents ───────────────────────────────────────────────────────────────
    const intentDefs = [
      {
        senderUserId: aisha._id, recipientUserId: john._id,
        senderWallet: aisha.walletAddress, recipientWallet: john.walletAddress,
        recipientEmail: john.email, amount: "0.02",
        txHash: "0xaaa111bbb222ccc333ddd444eee555fff666aaa111bbb222ccc333ddd444eee55",
        relayId: "relay-hfi-01", status: "CLAIMED",
      },
      {
        senderUserId: marcus._id, recipientUserId: priya._id,
        senderWallet: marcus.walletAddress, recipientWallet: priya.walletAddress,
        recipientEmail: priya.email, amount: "0.05",
        txHash: "0xbbb222ccc333ddd444eee555fff666aaa111bbb222ccc333ddd444eee555fff66",
        relayId: "relay-hfi-01", status: "EMAIL_SENT",
      },
      {
        senderUserId: john._id, recipientUserId: fatima._id,
        senderWallet: john.walletAddress, recipientWallet: fatima.walletAddress,
        recipientEmail: fatima.email, amount: "0.01",
        txHash: "0xccc333ddd444eee555fff666aaa111bbb222ccc333ddd444eee555fff666bbb22",
        relayId: "relay-west-africa", status: "FUNDED",
      },
      {
        senderUserId: priya._id, recipientUserId: aisha._id,
        senderWallet: priya.walletAddress, recipientWallet: aisha.walletAddress,
        recipientEmail: aisha.email, amount: "0.03",
        txHash: "0xddd444eee555fff666aaa111bbb222ccc333ddd444eee555fff666aaa111bbb22",
        relayId: "relay-hfi-01", status: "REFUNDED",
      },
    ];

    const createdIntents = [];
    for (const def of intentDefs) {
      const intent = await Intent.findOneAndUpdate(
        { txHash: def.txHash },
        { $setOnInsert: { ...def, reference: generateReference() } },
        { upsert: true, new: true }
      );
      createdIntents.push(intent);
    }

    // ── Notifications ─────────────────────────────────────────────────────────
    const existingCount = await Notification.countDocuments({ userId: aisha._id });
    if (existingCount === 0) {
      await Notification.insertMany([
        {
          type: "payment_received", userId: aisha._id,
          intentId: createdIntents[0]?._id,
          title: "💰 Incoming Payment",
          message: "John Chen sent you 0.02 ETH via HFI Pay.", read: true,
        },
        {
          type: "payment_refunded", userId: aisha._id,
          title: "↩️ Funds Refunded",
          message: "Your outgoing payment of 0.03 ETH was refunded.", read: false,
        },
        {
          type: "payment_claimed", userId: marcus._id,
          title: "💸 Funds Claimed",
          message: "Priya Patel claimed your payment of 0.05 ETH.", read: false,
        },
      ]);
    }

    return success({
      seeded: { relays: ALL_RELAYS.length, users: DEMO_USERS.length, intents: intentDefs.length },
      demoAccounts: DEMO_USERS.map((u) => ({
        name: u.displayName, email: u.email,
        wallet: u.walletAddress, relay: u.homeRelay,
      })),
    });
  } catch (err: any) {
    console.error("[POST /api/seed]", err);
    return failure(err.message ?? "Seed failed", 500);
  }
}
