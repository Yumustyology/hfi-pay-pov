"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { toast } from "sonner";

type Step = "info" | "otp" | "done";

export default function RegisterPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const [step, setStep] = useState<Step>("info");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  // Redirect if already registered
  useEffect(() => {
    if (!address) return;
    setChecking(true);
    fetch(`/api/users/search?walletAddress=${address}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.found) {
          document.cookie = `hfi_wallet=${address}; path=/; max-age=${30 * 24 * 60 * 60}`;
          router.replace("/dashboard");
        } else {
          document.cookie = "hfi_wallet=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, [address, router]);

  // ── Step 1: request OTP ──────────────────────────────────────────────────────

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) { setError("Enter your name"); return; }
    if (!email.trim() || !email.includes("@")) { setError("Enter a valid email"); return; }
    if (!isConnected) { setError("Connect your wallet first"); return; }

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
        toast.success("Verification code sent — check your email");
      } else {
        setError(data.error ?? "Failed to send code");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP → create account ─────────────────────────────────────

  const verifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim() || otp.length !== 6) { setError("Enter the 6-digit code"); return; }
    if (!address) { setError("Wallet disconnected. Reconnect and try again."); return; }

    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, walletAddress: address, otp }),
      });
      const data = await res.json();
      if (data.success) {
        document.cookie = `hfi_wallet=${address}; path=/; max-age=${30 * 24 * 60 * 60}`;
        setStep("done");
        toast.success("Identity created! Welcome to HFI Pay.");
        setTimeout(() => router.push("/dashboard"), 1000);
      } else {
        setError(data.error ?? "Verification failed");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden">

      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-[120px] opacity-60" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-600/20 blur-[120px] opacity-50" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-indigo-500/10 blur-[80px]" />
      </div>

      <div className="w-full max-w-md relative z-10">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand mb-4 glow-primary shadow-2xl">
            <span className="text-white text-2xl font-black">Ħ</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Claim Your HFI Identity</h1>
          <p className="text-muted-foreground text-sm mt-2">
            Link your email to your wallet — send and receive crypto by email
          </p>
        </div>

        {/* Step pills */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          {(["info", "otp"] as Step[]).map((s, i) => {
            const done = step === "otp" && s === "info" || step === "done";
            const active = step === s;
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? "bg-emerald-500 text-white" : active ? "bg-primary text-white" : "bg-white/10 text-muted-foreground"
                }`}>
                  {done && i === 0 ? "✓" : i + 1}
                </div>
                <span className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                  {s === "info" ? "Your details" : "Verify email"}
                </span>
                {i === 0 && <div className={`w-8 h-px ${step !== "info" ? "bg-emerald-500" : "bg-white/10"}`} />}
              </div>
            );
          })}
        </div>

        {/* Card */}
        <div className="glass card-shine border border-white/10 rounded-2xl p-6 space-y-4 shadow-2xl backdrop-blur-xl
          ring-1 ring-white/[0.04] [background:linear-gradient(135deg,rgba(79,70,229,0.05)_0%,rgba(124,58,237,0.03)_100%)]">

          {/* Wallet badge */}
          <div className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
            isConnected ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-amber-500/10 border border-amber-500/20"
          }`}>
            <span className={`w-2 h-2 rounded-full shrink-0 ${isConnected ? "bg-emerald-400" : "bg-amber-400"}`} />
            {checking
              ? <span className="text-muted-foreground">Checking account…</span>
              : isConnected
              ? <span className="text-emerald-400 font-mono text-xs">{address?.slice(0, 8)}…{address?.slice(-6)}</span>
              : <span className="text-amber-400">Connect your wallet to continue</span>}
          </div>

          {/* Step 1 — info */}
          {step === "info" && (
            <form onSubmit={requestOtp} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="reg-name">
                  Display Name
                </label>
                <input
                  id="reg-name"
                  type="text"
                  placeholder="Your name"
                  value={displayName}
                  onChange={(e) => { setDisplayName(e.target.value); setError(""); }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" htmlFor="reg-email">
                  Email Address
                </label>
                <input
                  id="reg-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-sm"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading || !isConnected}
                id="send-otp-btn"
                className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {loading ? "Sending code…" : "Send Verification Code →"}
              </button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === "otp" && (
            <form onSubmit={verifyAndRegister} className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Enter the 6-digit code sent to <strong className="text-foreground">{email}</strong>.
                Check your spam folder if it doesn&apos;t arrive within 30 seconds.
              </p>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                id="reg-otp"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono tracking-[0.5em] text-center text-2xl"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                id="verify-create-btn"
                className="w-full py-3 rounded-xl gradient-brand text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                {loading ? "Creating identity…" : "Verify & Create Identity →"}
              </button>
              <button
                type="button"
                onClick={() => { setStep("info"); setOtp(""); setError(""); }}
                className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                ← Change email or name
              </button>
            </form>
          )}

          {/* Done */}
          {step === "done" && (
            <div className="text-center py-6">
              <p className="text-4xl mb-3">✅</p>
              <p className="font-semibold text-emerald-400">Identity Created</p>
              <p className="text-sm text-muted-foreground mt-1">Redirecting to dashboard…</p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your identity is anchored to{" "}
          <span className="text-primary font-mono">relay-hfi-01</span> on the HFI network
        </p>
      </div>
    </div>
  );
}
