import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { ESCROW_ABI } from "@/contracts/abi";
import { getContractAddress } from "@/contracts/deployed";

// Public (read-only) client for Base Sepolia
export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

export function getEscrowContract(chainId: number) {
  const address = getContractAddress(chainId, "escrow");
  return { address, abi: ESCROW_ABI };
}

export async function getPaymentOnChain(paymentId: bigint, chainId: number) {
  const contract = getEscrowContract(chainId);
  const result = await publicClient.readContract({
    ...contract,
    functionName: "getPayment",
    args: [paymentId],
  });
  return result;
}
