"use client";

import { useState, useEffect } from "react";
import { XCircle, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserProfile {
  displayName: string;
  walletAddress: string;
  homeRelay: string;
  preferredChain: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  onSuccess: (profile: UserProfile) => void;
}

export default function RegisterModal({ isOpen, onClose, walletAddress, onSuccess }: Props) {
  const [step, setStep] = useState<"info" | "otp">("info");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError("Name is required");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError("Valid email is required");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("otp");
        setCountdown(30);
        toast.success("Verification code sent to your email!");
      } else {
        setError(data.error ?? "Failed to send verification code");
      }
    } catch {
      setError("Failed to connect. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setCountdown(30);
        toast.success("Verification code resent successfully!");
      } else {
        setError(data.error ?? "Failed to resend code");
      }
    } catch {
      setError("Failed to resend. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          email,
          walletAddress,
          otp,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Identity created successfully!");
        // Set the wallet cookie client-side
        document.cookie = `hfi_wallet=${walletAddress}; path=/; max-age=${30 * 24 * 60 * 60}`;
        onSuccess({
          displayName,
          walletAddress,
          homeRelay: data.data.homeRelay ?? "relay-hfi-01",
          preferredChain: data.data.preferredChain ?? "Base Sepolia",
        });
        onClose();
      } else {
        setError(data.error ?? "Verification failed. Try again.");
      }
    } catch {
      setError("Failed to verify code. Please check your network.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      <div className="w-full max-w-md glass border border-white/[0.08] rounded-3xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
        >
          <XCircle className="h-5 w-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/15 border border-primary/20 mb-3 shadow-md glow-sm">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Link HFI Identity</h2>
          <p className="text-muted-foreground text-xs mt-1">
            Register your email to enable passwordless transfers.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center flex items-center justify-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {step === "info" ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5 text-left">
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground" htmlFor="modal-name">
                Display Name
              </label>
              <input
                id="modal-name"
                type="text"
                required
                placeholder="e.g. John Doe"
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5 text-left">
              <label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground" htmlFor="modal-email">
                Email Address
              </label>
              <input
                id="modal-email"
                type="email"
                required
                placeholder="e.g. john@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg glow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending code...</span>
                </>
              ) : (
                <span>Request Verification Code</span>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <p className="text-xs text-muted-foreground text-center">
              We've sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
            </p>

            <div className="space-y-1.5">
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 font-mono tracking-[0.5em] text-center text-xl transition-all"
              />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => setStep("info")}
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                ← Back
              </button>

              <button
                type="button"
                disabled={countdown > 0 || loading}
                onClick={handleResendOtp}
                className="text-primary hover:text-primary-foreground font-semibold disabled:text-muted-foreground transition-colors cursor-pointer"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg glow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Verify & Link Account</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
