/**
 * scripts/check-onchain-payment.ts
 *
 * Checks details of a specific payment on-chain.
 *
 * Run: npx tsx scripts/check-onchain-payment.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { ethers } from "ethers";
import { ESCROW_ABI } from "../contracts/abi";
import { getContractAddress } from "../contracts/deployed";

const RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const ESCROW_ADDRESS = getContractAddress(84532, "escrow");

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const contract = new ethers.Contract(ESCROW_ADDRESS, ESCROW_ABI, provider);

  const paymentId = 0; // Let's check payment ID 0
  console.log(`Checking payment ID ${paymentId} on contract ${ESCROW_ADDRESS}...`);

  try {
    const p = await contract.getPayment(BigInt(paymentId));
    console.log({
      id: p.id.toString(),
      sender: p.sender,
      recipient: p.recipient,
      amount: ethers.formatEther(p.amount) + " ETH",
      claimed: p.claimed,
      refunded: p.refunded,
    });
  } catch (err: any) {
    console.error("Error fetching payment:", err.message);
  }
}

main().catch(console.error);
