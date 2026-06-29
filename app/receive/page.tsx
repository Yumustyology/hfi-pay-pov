"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Wallet,
  AlertCircle,
  Loader2,
  ExternalLink,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ESCROW_ABI } from "@/contracts/abi";
import { getContractAddress } from "@/contracts/deployed";
import { shortenWallet, formatDate } from "@/lib/utils";

interface Intent {
  _id: string;
  reference: string;
  senderWallet: string;
  recipientWallet: string;
  recipientEmail: string;
  amount: string;
  status: string;
  contractPaymentId?: number;
  txHash?: string;
  createdAt: string;
  senderUserId?: { displayName: string };
}

type ClaimStep = "idle" | "claiming" | "confirming" | "updating" | "done" | "error";

function ClaimForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intentId = searchParams.get("id");

  const { address, isConnected, chainId } = useAccount();
  const { writeContract, data: txHash, isPending: isTxPending, error: txError } =
    useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxConfirmed } =
    useWaitForTransactionReceipt({ hash: txHash });

  const [intent, setIntent] = useState<Intent | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [claimStep, setClaimStep] = useState<ClaimStep>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Load intent
  useEffect(() => {
    if (!intentId) {
      setFetchError("No payment intent specified. Check your link.");
      setLoading(false);
      return;
    }
    if (!isConnected || !address) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/intents/history?walletAddress=${address}`);
        const result = await res.json();
        if (result.success) {
          const match = (result.data?.intents ?? []).find(
            (i: Intent) => i._id === intentId || i.reference === intentId
          );
          if (match) setIntent(match);
          else setFetchError("Intent not found or you don't have permission.");
        } else {
          setFetchError("Failed to retrieve payment details.");
        }
      } catch (err: any) {
        setFetchError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [intentId, isConnected, address]);

  // On-chain confirmed → update DB
  useEffect(() => {
    if (isTxConfirmed && txHash && intent) {
      setClaimStep("updating");
      async function update() {
        try {
          const res = await fetch("/api/intents/claim", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reference: intent!.reference,
              claimantWallet: address,
              txHash,
            }),
          });
          const result = await res.json();
          if (result.success) {
            setClaimStep("done");
            toast.success("Funds claimed successfully!");
            setTimeout(() => router.push("/dashboard"), 3500);
          } else {
            setClaimStep("error");
            setErrorMsg(result.error ?? "DB sync failed");
          }
        } catch (err: any) {
          setClaimStep("error");
          setErrorMsg(err.message);
        }
      }
      update();
    }
  }, [isTxConfirmed, txHash, intent, router]);

  // Tx error
  useEffect(() => {
    if (txError) {
      setClaimStep("error");
      setErrorMsg(txError.message?.split("\n")[0] ?? "Transaction rejected");
      toast.error("Transaction rejected or failed");
    }
  }, [txError]);

  const handleClaim = async () => {
    if (!isConnected) { toast.error("Connect your wallet first"); return; }
    if (!intent) return;
    if (address?.toLowerCase() !== intent.recipientWallet.toLowerCase()) {
      toast.error("Connected wallet doesn't match the registered recipient wallet");
      return;
    }
    try {
      setClaimStep("claiming");
      setErrorMsg("");
      const contractAddress = getContractAddress(chainId ?? 84532, "escrow");
      writeContract({
        address: contractAddress,
        abi: ESCROW_ABI,
        functionName: "claimPayment",
        args: [BigInt(intent.contractPaymentId ?? 0)],
      });
      setClaimStep("confirming");
    } catch (err: any) {
      setClaimStep("error");
      setErrorMsg(err.message);
    }
  };

  const isBusy = ["claiming", "confirming", "updating"].includes(claimStep);
  const walletMatch = address?.toLowerCase() === intent?.recipientWallet?.toLowerCase();

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full gradient-brand animate-pulse glow-primary" />
          <p className="text-muted-foreground animate-pulse">Loading payment details…</p>
        </div>
      </div>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass border border-white/[0.07] rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl gradient-brand mx-auto flex items-center justify-center mb-4 glow-primary">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Connect Your Wallet</h1>
          <p className="text-muted-foreground text-sm mb-6">
            You need to connect the wallet registered to your HFI Pay email to claim these funds.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl gradient-brand text-white font-semibold hover:opacity-90 transition-all glow-sm"
          >
            <Wallet className="h-4 w-4" />
            Go Connect Wallet
          </Link>
        </motion.div>
      </div>
    );
  }

  // Error / not found
  if (fetchError || !intent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass border border-destructive/20 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 mx-auto flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-bold mb-2">Payment Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">{fetchError}</p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full py-3 rounded-xl glass border border-white/10 text-foreground font-semibold hover:bg-white/[0.06] transition-all"
          >
            Back to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  const STATUS_COLORS: Record<string, string> = {
    FUNDED: "text-indigo-400 bg-indigo-400/10 border-indigo-400/20",
    EMAIL_SENT: "text-violet-400 bg-violet-400/10 border-violet-400/20",
    CLAIMED: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    REFUNDED: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    CREATED: "text-sky-400 bg-sky-400/10 border-sky-400/20",
  };

  const isSender = address?.toLowerCase() === intent.senderWallet?.toLowerCase();
  const canClaim = (intent.status === "FUNDED" || intent.status === "EMAIL_SENT") && walletMatch && !isSender;

  // Sender landed here — redirect them back with a clear message
  if (isSender) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass border border-amber-400/20 rounded-2xl p-8 text-center"
        >
          <div className="w-16 h-16 rounded-2xl bg-amber-400/10 mx-auto flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold mb-2">This is your payment</h1>
          <p className="text-muted-foreground text-sm mb-6">
            You sent this payment — only the recipient can claim it.
            You can refund it from your dashboard if needed.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl glass border border-white/10 text-foreground font-semibold hover:bg-white/[0.06] transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 max-w-lg mx-auto">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`glass border rounded-2xl overflow-hidden ${claimStep === "done" ? "border-emerald-400/30" : "border-white/[0.07]"}`}>
          {/* Header */}
          <div className={`px-6 pt-6 pb-5 border-b border-white/[0.06] ${claimStep === "done" ? "bg-emerald-400/5" : ""}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center glow-sm ${
                claimStep === "done" ? "bg-emerald-400/20" : "gradient-brand"
              }`}>
                {claimStep === "done"
                  ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  : <Unlock className="h-5 w-5 text-white" />}
              </div>
              <div>
                <h1 className="text-xl font-bold">
                  {claimStep === "done" ? "Payment Claimed!" : "Claim Escrowed ETH"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {claimStep === "done"
                    ? "Funds released to your wallet"
                    : "Funds locked via HFI Pay escrow contract"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {/* Payment details */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] space-y-3">
              {[
                { label: "Reference", value: intent.reference, mono: true },
                { label: "From", value: intent.senderUserId?.displayName ?? shortenWallet(intent.senderWallet), mono: false },
                { label: "Sender Wallet", value: shortenWallet(intent.senderWallet), mono: true },
                { label: "Date", value: formatDate(intent.createdAt), mono: false },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-muted-foreground shrink-0">{label}</span>
                  <span className={`font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm pt-1 border-t border-white/[0.05]">
                <span className="text-muted-foreground">Status</span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLORS[intent.status] ?? ""}`}>
                  {intent.status}
                </span>
              </div>
            </div>

            {/* Amount highlight */}
            <div className="text-center py-4 px-6 rounded-2xl gradient-border glow-primary">
              <div className="bg-card rounded-xl py-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                  {walletMatch ? "You receive" : "Amount"}
                </p>
                <p className="text-5xl font-bold gradient-text">{intent.amount}</p>
                <p className="text-muted-foreground text-sm mt-1">ETH on Base Sepolia</p>
              </div>
            </div>

            {/* Wallet mismatch warning */}
            {isConnected && !walletMatch && intent.status !== "CLAIMED" && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-400/8 border border-amber-400/20">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-400 mb-1">Wrong wallet</p>
                  <p className="text-muted-foreground text-xs">
                    Connected:{" "}
                    <span className="font-mono">{shortenWallet(address ?? "")}</span>
                    <br />
                    Required:{" "}
                    <span className="font-mono">{shortenWallet(intent.recipientWallet)}</span>
                  </p>
                </div>
              </div>
            )}

            {/* Status display */}
            <AnimatePresence mode="wait">
              {claimStep === "confirming" && (
                <motion.div
                  key="confirming"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl glass border border-primary/20 flex items-center gap-3"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-primary">Confirming on-chain…</p>
                    <p className="text-xs text-muted-foreground">Waiting for block confirmation.</p>
                  </div>
                </motion.div>
              )}
              {claimStep === "updating" && (
                <motion.div
                  key="updating"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="p-4 rounded-xl glass border border-violet-400/20 flex items-center gap-3"
                >
                  <Loader2 className="h-5 w-5 animate-spin text-violet-400 shrink-0" />
                  <p className="text-sm text-violet-400 font-semibold">Confirmed! Syncing records…</p>
                </motion.div>
              )}
              {claimStep === "done" && (
                <motion.div
                  key="done"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-xl bg-emerald-400/8 border border-emerald-400/20 space-y-1"
                >
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <p className="font-semibold">Funds released to your wallet!</p>
                  </div>
                  {txHash && (
                    <a
                      href={`https://sepolia.basescan.org/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-emerald-400/70 hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View transaction on Basescan
                    </a>
                  )}
                </motion.div>
              )}
              {claimStep === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 rounded-xl bg-destructive/8 border border-destructive/20 flex items-start gap-3"
                >
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive">Error</p>
                    <p className="text-xs text-muted-foreground mt-0.5 break-all">{errorMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Claim button */}
            {intent.status === "CLAIMED" ? (
              <div className="w-full py-3.5 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 font-semibold text-center flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Already Claimed
              </div>
            ) : (
              <button
                onClick={handleClaim}
                disabled={isBusy || !canClaim || claimStep === "done"}
                id="claim-btn"
                className="w-full py-3.5 rounded-xl gradient-brand text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-all hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 glow-sm"
              >
                {isBusy ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {claimStep === "confirming" ? "Confirming…" : "Processing…"}
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    Claim {intent.amount} ETH
                  </>
                )}
              </button>
            )}

            <p className="text-center text-xs text-muted-foreground">
              Claiming will call <code className="text-primary">claimPayment()</code> on the HFI Escrow contract and release ETH to your wallet.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm text-center">Loading claim details…</p>}>
      <ClaimForm />
    </Suspense>
  );
}

