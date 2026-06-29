"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import Link from "next/link";
import { toast } from "sonner";
import { ESCROW_ABI } from "@/contracts/abi";
import { getContractAddress } from "@/contracts/deployed";
import { useProtocolLog } from "@/lib/protocol-log";
import RecipientLookup, { type ResolvedRecipient } from "@/features/send/RecipientLookup";

function SendForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address, isConnected, chainId } = useAccount();
  const { pushStep, updateStep, clearSteps, setOpen: openPanel } = useProtocolLog();

  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  // Pre-fill from dashboard Quick Send
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [amount, setAmount] = useState(searchParams.get("amount") ?? "");
  const [recipient, setRecipient] = useState<ResolvedRecipient | null>(null);

  type Step = "idle" | "sending" | "confirming" | "saving" | "done" | "error";
  const [step, setStep] = useState<Step>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [reference, setReference] = useState("");

  // On-chain confirmed → save intent
  useEffect(() => {
    if (!isTxConfirmed || !txHash || !recipient) return;

    setStep("saving");
    updateStep("confirm", { status: "done", detail: txHash.slice(0, 20) + "…" });
    pushStep({ id: "save", label: "Saving intent & sending email…", status: "active" });

    fetch("/api/intents/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        senderWallet: address,
        recipientEmail: email,
        amount,
        txHash,
        contractPaymentId: 0,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setReference(data.data.reference ?? "");
          setStep("done");
          updateStep("save", { status: "done", detail: data.data.reference });
          pushStep({ id: "await", label: "Awaiting claim by recipient", status: "pending" });
          toast.success(`Sent! Ref: ${data.data.reference}`);
          setTimeout(() => router.push("/dashboard"), 3000);
        } else {
          setStep("error");
          setErrorMsg(data.error ?? "Failed to save intent");
          updateStep("save", { status: "error" });
        }
      })
      .catch((e) => {
        setStep("error");
        setErrorMsg(e.message);
        updateStep("save", { status: "error" });
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTxConfirmed, txHash]);

  // Tx error
  useEffect(() => {
    if (!txError) return;
    setStep("error");
    setErrorMsg(txError.message?.split("\n")[0] ?? "Transaction rejected");
    updateStep("sign", { status: "error", detail: "User rejected" });
    toast.error("Transaction rejected");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txError]);

    const handleSend = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!isConnected) { toast.error("Connect wallet first"); return; }
      if (!recipient) { toast.error("Select a verified recipient"); return; }
      if (address && recipient.walletAddress.toLowerCase() === address.toLowerCase()) {
        toast.error("You cannot send payments to your own wallet");
        return;
      }
      if (!amount || parseFloat(amount) <= 0) { toast.error("Enter a valid amount"); return; }

    clearSteps();
    openPanel(true);
    pushStep({ id: "resolve", label: "Recipient resolved via relay", status: "done", detail: recipient.homeRelay });
    pushStep({ id: "sign", label: "Requesting MetaMask signature…", status: "active" });

    setStep("sending");
    setErrorMsg("");

    try {
      const contractAddress = getContractAddress(chainId ?? 84532, "escrow");
      writeContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: "createPayment",
        args: [recipient.walletAddress as `0x${string}`],
        value: parseEther(amount),
      });
      setStep("confirming");
      updateStep("sign", { status: "done" });
      pushStep({ id: "confirm", label: "Confirming on Base Sepolia…", status: "active" });
    } catch (err: any) {
      setStep("error");
      setErrorMsg(err.message);
      updateStep("sign", { status: "error" });
    }
  };

  const isBusy = ["sending", "confirming", "saving"].includes(step);

  return (
    <div className="glass border border-white/8 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-white/[0.06]">
        <h1 className="text-xl font-bold">Send Payment</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Send ETH to anyone using their email address
        </p>
      </div>

      <form onSubmit={handleSend} className="p-6 space-y-5">
        {/* Recipient lookup */}
        <RecipientLookup
          value={email}
          onChange={setEmail}
          onResolved={setRecipient}
          disabled={isBusy || step === "done"}
          connectedAddress={address}
        />

        {/* Amount */}
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="send-amount">
            Amount (ETH)
          </label>
          <div className="relative">
            <input
              type="number"
              id="send-amount"
              step="0.0001"
              min="0.0001"
              placeholder="0.05"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isBusy || step === "done"}
              className="w-full px-4 py-3 pr-14 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm disabled:opacity-50"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono">
              ETH
            </span>
          </div>
        </div>

        {/* Summary */}
        {recipient && amount && step === "idle" && (
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">To</span>
              <span className="font-medium">{recipient.displayName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">{amount} ETH</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Via</span>
              <span className="text-primary text-xs font-mono">{recipient.homeRelay}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Escrow</span>
              <span className="text-xs text-muted-foreground">HFI Escrow Contract</span>
            </div>
          </div>
        )}

        {/* Status */}
        {step === "sending" && (
          <p className="text-sm text-primary">Waiting for MetaMask…</p>
        )}
        {step === "confirming" && (
          <p className="text-sm text-primary">
            Confirming on-chain…
            {txHash && (
              <a
                href={`https://sepolia.basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 underline text-xs"
              >
                View tx
              </a>
            )}
          </p>
        )}
        {step === "saving" && (
          <p className="text-sm text-violet-400">Transaction confirmed! Saving intent…</p>
        )}
        {step === "done" && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
            ✓ Payment locked. Ref:{" "}
            <span className="font-mono">{reference}</span>. Redirecting…
          </div>
        )}
        {step === "error" && (
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive break-all">
            {errorMsg}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isBusy || step === "done" || !recipient || !amount}
          id="send-submit"
          className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isBusy
            ? step === "confirming"
              ? "Confirming…"
              : step === "saving"
              ? "Saving…"
              : "Processing…"
            : step === "done"
            ? "Sent ✓"
            : "Lock in Escrow"}
        </button>
      </form>
    </div>
  );
}

export default function SendPage() {
  return (
    <div className="min-h-screen py-12 px-4 max-w-lg mx-auto">
      <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground block mb-8">
        ← Back to Dashboard
      </Link>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Loading checkout details…</p>}>
        <SendForm />
      </Suspense>
      <p className="text-center text-xs text-muted-foreground mt-5">
        Funds locked on Base Sepolia. Recipient has 7 days to claim.
      </p>
    </div>
  );
}

