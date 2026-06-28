import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { DEFAULT_RELAY_ID } from "@/features/relay/relay.constants";

export async function findByEmail(email: string) {
  await connectDB();
  return User.findOne({ email: email.trim().toLowerCase() });
}

export async function findByWallet(wallet: string) {
  await connectDB();
  return User.findOne({ walletAddress: wallet.trim().toLowerCase() });
}

export async function findByIdentifier(identifier: string) {
  await connectDB();
  const normalized = identifier.trim().toLowerCase();
  // Wallet address
  if (normalized.startsWith("0x")) {
    return User.findOne({ walletAddress: normalized });
  }
  // Email
  if (normalized.includes("@")) {
    return User.findOne({ email: normalized });
  }
  return null;
}

export async function createUser(data: {
  displayName: string;
  email: string;
  walletAddress: string;
}) {
  await connectDB();
  return User.create({
    displayName: data.displayName.trim(),
    email: data.email.trim().toLowerCase(),
    walletAddress: data.walletAddress.trim().toLowerCase(),
    homeRelay: DEFAULT_RELAY_ID,
    preferredChain: "Base Sepolia",
    isVerified: true,
  });
}
