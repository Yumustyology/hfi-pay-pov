"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useChainId, useAccount } from "wagmi";
import { Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { ESCROW_ABI } from "@/contracts/abi";
import { getContractAddress } from "@/contracts/deployed";

interface Props {
  intent: {
    _id: string;
    reference: string;
    createdAt: string;
    contractPaymentId?: number;
    amount: string;
  };
  onSuccess?: () => void;
}

export default function RefundButton({ intent, onSuccess }: Props) {
  const chainId = useChainId();
  const { address } = useAccount();
  const [updating, setUpdating] = useState(false);

  const { writeContract, data: hash, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Calculate if the payment has expired (7 days)
  const createdAtMs = new Date(intent.createdAt).getTime();
  const expiryMs = createdAtMs + 7 * 24 * 60 * 60 * 1000;
  const isExpired = Date.now() > expiryMs;

  const daysLeft = Math.ceil((expiryMs - Date.now()) / (24 * 60 * 60 * 1000));

  // Handle transaction errors
  useEffect(() => {
    if (txError) {
      const errorMsg = txError.message?.split("\n")[0] ?? "Transaction failed";
      toast.error(errorMsg.includes("Not expired") 
        ? "Escrow lock period active. Unclaimed payments can only be refunded 7 days after creation."
        : `Refund failed: ${errorMsg}`
      );
      setUpdating(false);
    }
  }, [txError]);

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && hash) {
      syncRefundToDb(hash);
    }
  }, [isConfirmed, hash]);

  async function syncRefundToDb(txHash: string) {
    setUpdating(true);
    try {
      const res = await fetch("/api/intents/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: intent.reference,
          requesterWallet: address,
          txHash,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to sync refund with database");
      } else {
        toast.success(`Successfully refunded ${intent.amount} ETH!`);
        if (onSuccess) onSuccess();
      }
    } catch {
      toast.error("Network error syncing refund data");
    } finally {
      setUpdating(false);
    }
  }

  async function handleRefund() {
    if (!address) {
      toast.error("Connect your wallet to trigger refund");
      return;
    }
    if (intent.contractPaymentId === undefined || intent.contractPaymentId === null) {
      toast.error("Cannot refund: Missing escrow payment ID");
      return;
    }

    try {
      setUpdating(true);
      const contractAddress = getContractAddress(chainId ?? 84532, "escrow");
      writeContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: "refundPayment",
        args: [BigInt(intent.contractPaymentId)],
      });
      toast.info("Please confirm the refund transaction in your wallet...");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to trigger refund transaction");
      setUpdating(false);
    }
  }

  const isProcessing = isTxPending || isConfirming || updating;

  return (
    <button
      onClick={handleRefund}
      disabled={isProcessing}
      title={
        isExpired 
          ? "Reclaim your unclaimed escrowed funds" 
          : `Escrow lock active. Refundable in ${daysLeft} days.`
      }
      className="flex items-center justify-end gap-1 text-[10px] text-muted-foreground hover:text-amber-400 disabled:opacity-50 transition-colors cursor-pointer"
    >
      {isProcessing ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <RotateCcw className="h-2.5 w-2.5" />
      )}
      {isProcessing ? "Processing…" : "Refund"}
    </button>
  );
}
