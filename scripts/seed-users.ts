import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, "../.env.local") });

// === Crypto helpers (inline to avoid import issues in scripts) ===
const RELAY_SECRET =
  process.env.RELAY_ENCRYPTION_KEY || "hfi-demo-secret-key-32-chars-pad!";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashIdentifier(email: string) {
  return crypto
    .createHash("sha256")
    .update(normalizeEmail(email))
    .digest("hex");
}

function encryptEmail(email: string) {
  const key = crypto.scryptSync(RELAY_SECRET, "hfi-salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(normalizeEmail(email), "utf8"),
    cipher.final(),
  ]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

// === Schema ===
const UserSchema = new mongoose.Schema(
  {
    displayName: { type: String, required: true },
    encryptedEmail: { type: String, required: true },
    identifierHash: { type: String, required: true, unique: true },
    homeRelay: { type: String, default: "relay-1.hfi.local" },
    walletAddress: {
      type: String,
      unique: true,
      required: true,
      lowercase: true,
    },
    preferredChain: { type: String, default: "Base Sepolia" },
    avatar: String,
    isSeeded: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

// === Seed data ===
const DEMO_USERS = [
  {
    displayName: "John Doe",
    email: "john@gmail.com",
    wallet: "0x1111111111111111111111111111111111111111",
  },
  {
    displayName: "Fatima Musa",
    email: "fatima@gmail.com",
    wallet: "0x2222222222222222222222222222222222222222",
  },
  {
    displayName: "Alex Johnson",
    email: "alex@gmail.com",
    wallet: "0x3333333333333333333333333333333333333333",
  },
  {
    displayName: "Mary Adams",
    email: "mary@gmail.com",
    wallet: "0x4444444444444444444444444444444444444444",
  },
  {
    displayName: "David Okafor",
    email: "david@gmail.com",
    wallet: "0x5555555555555555555555555555555555555555",
  },
  {
    displayName: "Amina Hassan",
    email: "amina@gmail.com",
    wallet: "0x6666666666666666666666666666666666666666",
  },
  {
    displayName: "Chidi Nwosu",
    email: "chidi@gmail.com",
    wallet: "0x7777777777777777777777777777777777777777",
  },
  {
    displayName: "Sarah Williams",
    email: "sarah@gmail.com",
    wallet: "0x8888888888888888888888888888888888888888",
  },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not found in .env.local");

  await mongoose.connect(uri);
  console.log("✅ Connected to MongoDB:", uri);

  await User.deleteMany({ isSeeded: true });
  console.log("🗑️  Cleared previous seed users");

  const docs = DEMO_USERS.map((u) => ({
    displayName: u.displayName,
    encryptedEmail: encryptEmail(u.email),
    identifierHash: hashIdentifier(u.email),
    walletAddress: u.wallet.toLowerCase(),
    homeRelay: "relay-1.hfi.local",
    preferredChain: "Base Sepolia",
    isSeeded: true,
  }));

  await User.insertMany(docs);
  console.log(`🌱 Seeded ${docs.length} demo users`);
  console.log("   Emails are encrypted - lookup by hash only");
  console.log("   Example: search?email=john@gmail.com → hash lookup → ✅");

  await mongoose.disconnect();
  console.log("✅ Done. Check MongoDB Compass → hifi-pay → users");
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
